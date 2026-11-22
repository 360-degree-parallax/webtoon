"""Render a rough panel with Cloudflare Workers AI FLUX.2 [klein] 4B."""
import base64
import json
import logging
import os
import re
import struct
import urllib.error
import urllib.request
import uuid

MAX_REQUEST = 4 * 1024 * 1024
MODEL = "@cf/black-forest-labs/flux-2-klein-4b"
PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


class ImageRequestError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def png(value):
    if not isinstance(value, str):
        raise ImageRequestError(400, "참고 이미지를 읽을 수 없어요.")
    try:
        data = base64.b64decode(value, validate=True)
    except ValueError:
        raise ImageRequestError(400, "참고 이미지를 읽을 수 없어요.") from None
    if len(data) < 33 or not data.startswith(PNG_SIGNATURE) or data[12:16] != b"IHDR":
        raise ImageRequestError(400, "참고 이미지는 PNG로 보내주세요.")
    width, height = struct.unpack(">II", data[16:24])
    if not 0 < min(width, height) <= max(width, height) < 512:
        raise ImageRequestError(400, "스케치와 참고 이미지는 가로·세로 모두 512px 미만이어야 해요.")
    return data


def multipart(fields, images):
    boundary = uuid.uuid4().hex
    body = bytearray()
    for name, value in fields.items():
        body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    for index, data in enumerate(images):
        body.extend((
            f'--{boundary}\r\nContent-Disposition: form-data; name="input_image_{index}"; filename="reference-{index}.png"\r\n'
            'Content-Type: image/png\r\n\r\n'
        ).encode())
        body.extend(data)
        body.extend(b'\r\n')
    body.extend(f'--{boundary}--\r\n'.encode())
    return bytes(body), f"multipart/form-data; boundary={boundary}"


def output_dimensions(ratio):
    if type(ratio) not in (int, float) or not .4 <= ratio <= 3:
        raise ImageRequestError(400, "지원하는 컷 비율을 선택해주세요.")
    width = max(320, min(1024, round(640 / max(1, ratio ** .5) / 16) * 16))
    height = max(256, round(width * ratio / 16) * 16)
    return width, height


def image_type(data):
    if data.startswith(PNG_SIGNATURE):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    raise ValueError("Unsupported image response")


def cloudflare_error(error):
    with error:
        try:
            errors = json.load(error).get("errors", [])
            codes = {str(item.get("code")) for item in errors if isinstance(item, dict)}
        except (OSError, AttributeError, TypeError, ValueError):
            codes = set()
    logging.warning("Workers AI returned HTTP %s (codes %s)", error.code, ", ".join(sorted(codes)))
    if codes.intersection({"3036", "4006"}):
        return ImageRequestError(429, "Cloudflare의 하루 무료 생성 한도를 다 썼어요. 다음 할당량이 열리면 다시 시도해주세요.")
    if error.code == 429:
        return ImageRequestError(429, "Cloudflare 이미지 생성 요청이 많아요. 잠시 후 다시 시도해주세요.")
    if error.code in (401, 403):
        return ImageRequestError(502, "Cloudflare 계정 ID와 Workers AI 토큰 권한을 확인해주세요.")
    if error.code in (400, 413, 422):
        return ImageRequestError(400, "Cloudflare가 이미지 요청을 처리하지 못했어요. 컷 설명과 참고 이미지를 확인해주세요.")
    return ImageRequestError(502, "Cloudflare 이미지 생성에 실패했어요. 다시 시도해주세요.")


def generate_panel(payload):
    account = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
    token = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
    if not account or not token:
        raise ImageRequestError(503, "CLOUDFLARE_ACCOUNT_ID와 CLOUDFLARE_API_TOKEN을 설정한 뒤 서버를 다시 실행해주세요.")
    if not re.fullmatch(r"[0-9a-fA-F]{32}", account):
        raise ImageRequestError(503, "CLOUDFLARE_ACCOUNT_ID에 Cloudflare 계정 ID를 입력했는지 확인해주세요.")
    if not isinstance(payload, dict):
        raise ImageRequestError(400, "컷 정보를 읽을 수 없어요.")
    direction = payload.get("direction")
    if not isinstance(direction, str) or not direction.strip() or len(direction) > 5500:
        raise ImageRequestError(400, "컷 설명을 5,500자 이내로 줄여주세요.")
    width, height = output_dimensions(payload.get("ratio"))
    images = [png(payload.get("sketch"))]
    reference_guide = ""
    if payload.get("reference") is not None:
        images.append(png(payload["reference"]))
        reference_guide = "Image 1 is a character reference. Keep the character's facial features, hairstyle and costume consistent. "

    fields = {
        "prompt": (
            "Draw one Korean scroll-webtoon storyboard panel as a loose color rough with gestural lines and broad color blocks. "
            "Use image 0 as a loose placement sketch. Follow the panel direction for the camera, subject, and action. "
            f"{reference_guide}Fill the panel edge to edge. Keep the focal point within the central frame. "
            "Keep the artwork free of speech bubbles, caption boxes, letters, sound effects, panel numbers, and signatures. "
            f"\n\nPanel direction:\n{direction}"
        ),
        "width": width,
        "height": height,
    }
    body, media_type = multipart(fields, images)
    request = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/{MODEL}",
        data=body,
        headers={"Authorization": f"Bearer {token}", "Content-Type": media_type},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = base64.b64decode(json.load(response)["result"]["image"], validate=True)
        return image_type(data), data
    except urllib.error.HTTPError as error:
        raise cloudflare_error(error) from None
    except (OSError, TypeError, ValueError, KeyError, IndexError):
        logging.warning("Workers AI connection or response failed", exc_info=True)
        raise ImageRequestError(502, "Cloudflare에서 이미지를 받지 못했어요. 다시 시도해주세요.") from None
