"""Render a single rough panel with the OpenAI Images API."""
import base64
import binascii
import json
import logging
import os
import urllib.error
import urllib.request
import uuid

MAX_REQUEST = 8 * 1024 * 1024
DEFAULT_MODEL = "gpt-image-2.5-flare"
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
    except (ValueError, binascii.Error):
        raise ImageRequestError(400, "참고 이미지를 읽을 수 없어요.") from None
    if not data.startswith(PNG_SIGNATURE):
        raise ImageRequestError(400, "참고 이미지는 PNG로 보내주세요.")
    return data


def multipart(fields, images):
    boundary = uuid.uuid4().hex
    body = bytearray()
    for name, value in fields.items():
        body.extend(f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode())
    for filename, data in images:
        body.extend((
            f'--{boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="{filename}"\r\n'
            'Content-Type: image/png\r\n\r\n'
        ).encode())
        body.extend(data)
        body.extend(b'\r\n')
    body.extend(f'--{boundary}--\r\n'.encode())
    return bytes(body), f"multipart/form-data; boundary={boundary}"


def generate_panel(payload):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ImageRequestError(503, "터미널에서 OPENAI_API_KEY를 설정한 뒤 러프 툴 서버를 다시 시작해주세요.")
    if not isinstance(payload, dict):
        raise ImageRequestError(400, "컷 정보를 읽을 수 없어요.")
    direction = payload.get("direction")
    if not isinstance(direction, str) or not direction.strip() or len(direction) > 5500:
        raise ImageRequestError(400, "컷 설명을 5,500자 이내로 줄여주세요.")
    size = payload.get("size")
    if size not in ("1536x1024", "1024x1024", "1024x1536", "768x2304"):
        raise ImageRequestError(400, "지원하는 컷 비율을 선택해주세요.")

    configured_model = os.getenv("OPENAI_IMAGE_MODEL") or DEFAULT_MODEL
    # Other GPT Image models may only accept the three standard dimensions.
    if size == "768x2304" and configured_model != DEFAULT_MODEL:
        size = "1024x1536"
    images = [("composition.png", png(payload.get("sketch")))]
    reference_guide = ""
    if payload.get("reference"):
        images.append(("character-reference.png", png(payload["reference"])))
        reference_guide = (
            "The second input is an original character reference. Keep its identity, hair, and costume consistent. "
            "Use the first input and panel direction for the composition. "
        )

    fields = {
        "model": configured_model,
        "prompt": (
            "Draw one Korean scroll-webtoon storyboard panel, a loose color rough with gestural lines and broad "
            "color blocks. Use the first input as a loose placement sketch. Follow the described camera angle, "
            "subject and action when they add detail to the sketch. "
            f"{reference_guide}Fill the panel edge to edge without page margins. Keep the focal point within the central frame. "
            "Do not draw speech bubbles, caption boxes, letters, sound-effect typography, panel numbers, or signatures. "
            f"\n\nPanel direction:\n{direction}"
        ),
        "size": size,
        "quality": "medium",
        "output_format": "jpeg",
        "output_compression": "85",
    }
    body, content_type = multipart(fields, images)
    request = urllib.request.Request(
        "https://api.openai.com/v1/images/edits",
        data=body,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": content_type},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=240) as response:
            data = base64.b64decode(json.load(response)["data"][0]["b64_json"], validate=True)
        if not data.startswith(b"\xff\xd8\xff"):
            raise ValueError("Expected JPEG output")
        return data
    except urllib.error.HTTPError as error:
        logging.warning("Image API returned HTTP %s (request ID %s)", error.code, error.headers.get("x-request-id"))
        if error.code in (401, 403):
            raise ImageRequestError(502, "OpenAI API 키와 이미지 모델 사용 권한을 확인해주세요.") from None
        if error.code == 429:
            raise ImageRequestError(429, "이미지 API 사용량 또는 결제 한도에 도달했어요. 잠시 후 다시 시도해주세요.") from None
        if error.code == 400:
            raise ImageRequestError(400, "이미지 API가 요청을 받지 못했어요. 설명, 참고 이미지, 모델 설정을 확인해주세요.") from None
    except (OSError, TypeError, ValueError, KeyError, IndexError):
        logging.warning("Image API connection or response failed", exc_info=True)
    raise ImageRequestError(502, "이미지 생성에 실패했어요. 다시 시도해주세요.")
