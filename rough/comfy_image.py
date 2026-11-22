"""Run the FLUX.2 Klein 4B distilled edit graph on a local ComfyUI server."""
import json
import os
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

MODEL = "flux-2-klein-4b-fp8.safetensors"
CLIP = "qwen_3_4b.safetensors"
VAE = "flux2-vae.safetensors"


class ComfyError(Exception):
    """A user-facing ComfyUI setup or generation error."""

    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def workflow(prompt, width, height, images):
    # This is the API graph for the official distilled image-edit recipe.
    # Reference images are already scaled by the rough editor.
    graph = {}

    def add(node, **inputs):
        key = str(len(graph) + 1)
        graph[key] = {"class_type": node, "inputs": inputs}
        return [key, 0]

    model = add("UNETLoader", unet_name=MODEL, weight_dtype="default")
    clip = add("CLIPLoader", clip_name=CLIP, type="flux2", device="default")
    vae = add("VAELoader", vae_name=VAE)
    positive = add("CLIPTextEncode", text=prompt, clip=clip)
    negative = add("ConditioningZeroOut", conditioning=positive)
    for name in images:
        pixels = add("LoadImage", image=name)
        latent = add("VAEEncode", pixels=pixels, vae=vae)
        positive = add("ReferenceLatent", conditioning=positive, latent=latent)
        negative = add("ReferenceLatent", conditioning=negative, latent=latent)
    guider = add("CFGGuider", model=model, positive=positive, negative=negative, cfg=1.0)
    noise = add("RandomNoise", noise_seed=secrets.randbits(48))
    sampler = add("KSamplerSelect", sampler_name="euler")
    sigmas = add("Flux2Scheduler", steps=4, width=width, height=height)
    latent_image = add("EmptyFlux2LatentImage", width=width, height=height, batch_size=1)
    samples = add("SamplerCustomAdvanced", noise=noise, guider=guider, sampler=sampler,
                  sigmas=sigmas, latent_image=latent_image)
    pixels = add("VAEDecode", samples=samples, vae=vae)
    output_id, _ = add("PreviewImage", images=pixels)
    return graph, output_id


def render(prompt, width, height, images):
    try:
        port = int(os.getenv("COMFYUI_PORT", "8188"))
        if not 1 <= port <= 65535:
            raise ValueError
    except ValueError:
        raise ComfyError(503, "COMFYUI_PORT에는 ComfyUI 주소의 포트 번호를 넣어주세요.") from None

    base = f"http://127.0.0.1:{port}"
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))

    def request(path, data=None, content_type="application/json", binary=False):
        message = urllib.request.Request(base + path, data=data, headers={"Content-Type": content_type})
        try:
            with opener.open(message, timeout=15) as response:
                return response.read() if binary else json.load(response)
        except urllib.error.HTTPError as error:
            with error:
                if path == "/prompt" and error.code == 400:
                    raise ComfyError(
                        502, "ComfyUI가 워크플로를 받지 못했어요. ComfyUI 버전과 FLUX.2 Klein 4B 모델 파일 3개를 확인해주세요."
                    ) from None
            raise ComfyError(502, f"ComfyUI 요청에 실패했어요 (HTTP {error.code}).") from None
        except (OSError, ValueError):
            raise ComfyError(503, f"{base}에서 ComfyUI에 연결하지 못했어요. ComfyUI를 켜고 포트를 확인해주세요.") from None

    names = []
    for pixels in images:
        boundary = uuid.uuid4().hex
        filename = f"rough-{uuid.uuid4().hex}.png"
        head = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{filename}"\r\n'
            'Content-Type: image/png\r\n\r\n'
        ).encode()
        body = head + pixels + f"\r\n--{boundary}--\r\n".encode()
        reply = request("/upload/image", body, f"multipart/form-data; boundary={boundary}")
        if not isinstance(reply, dict) or not isinstance(reply.get("name"), str):
            raise ComfyError(502, "ComfyUI에 참고 이미지를 올리지 못했어요.")
        names.append(reply["name"])

    graph, output_id = workflow(prompt, width, height, names)
    queued = request("/prompt", json.dumps({"prompt": graph}).encode())
    if not isinstance(queued, dict) or not isinstance(queued.get("prompt_id"), str):
        raise ComfyError(502, "ComfyUI에서 생성 작업 번호를 받지 못했어요.")
    prompt_id = queued["prompt_id"]
    history_path = "/history/" + urllib.parse.quote(prompt_id, safe="")
    deadline = time.monotonic() + 480
    while time.monotonic() < deadline:
        result = request(history_path).get(prompt_id)
        if result is None:
            time.sleep(1)
            continue
        output = result.get("outputs", {}).get(output_id, {}).get("images", [])
        if output:
            image = output[0]
            query = urllib.parse.urlencode({key: image[key] for key in ("filename", "subfolder", "type") if key in image})
            return request("/view?" + query, binary=True)
        raise ComfyError(502, "ComfyUI가 컷을 생성하지 못했어요. ComfyUI 창에서 모델 또는 메모리 오류를 확인해주세요.")
    raise ComfyError(504, "ComfyUI에서 8분 안에 결과를 받지 못했어요. ComfyUI 창에서 대기열을 확인해주세요.")
