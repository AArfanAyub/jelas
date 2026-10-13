#!/usr/bin/env python3
"""Generate JELAS launcher icons — the dark "clear line" mark.
Deep charcoal gradient, paper line, teal accent dot.
Pure Python: signed-distance rendering + a minimal PNG encoder. Original artwork.
"""
import math, struct, zlib, os

# dark, slick palette
BG_TOP = (38, 40, 45)      # #26282D
BG_BOT = (16, 17, 20)      # #101114
PAPER = (245, 243, 238)    # #F5F3EE
TEAL = (47, 160, 140)      # #2FA08C


def sd_round_rect(px, py, cx, cy, hw, hh, r):
    qx = abs(px - cx) - (hw - r)
    qy = abs(py - cy) - (hh - r)
    ax, ay = max(qx, 0.0), max(qy, 0.0)
    return math.hypot(ax, ay) + min(max(qx, qy), 0.0) - r


def sd_segment(px, py, x1, y1, x2, y2, half):
    dx, dy = x2 - x1, y2 - y1
    l2 = dx * dx + dy * dy
    t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((px - x1) * dx + (py - y1) * dy) / l2))
    return math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)) - half


def over(dst, src, a):
    return tuple(dst[i] * (1 - a) + src[i] * a for i in range(3))


def render(N):
    SS = 3
    inv = 1.0 / SS
    out = bytearray()
    for y in range(N):
        out.append(0)
        for x in range(N):
            acc = [0.0, 0.0, 0.0]
            for sy in range(SS):
                for sx in range(SS):
                    nx = (x + (sx + 0.5) * inv) / N
                    ny = (y + (sy + 0.5) * inv) / N
                    col = (0.0, 0.0, 0.0)

                    # rounded-square background with a soft vertical gradient
                    d = sd_round_rect(nx, ny, 0.5, 0.5, 0.5, 0.5, 0.235)
                    a = max(0.0, min(1.0, 0.5 - d * N * 0.44))
                    if a > 0:
                        g = ny
                        bg = tuple(BG_TOP[i] * (1 - g) + BG_BOT[i] * g for i in range(3))
                        col = over(col, bg, a)

                    # the clear line
                    d = sd_segment(nx, ny, 0.27, 0.5, 0.60, 0.5, 0.031)
                    a = max(0.0, min(1.0, 0.5 - d * N * 0.44))
                    if a > 0:
                        col = over(col, PAPER, a)

                    # the settled dot, in the signature teal
                    d = math.hypot(nx - 0.725, ny - 0.5) - 0.062
                    a = max(0.0, min(1.0, 0.5 - d * N * 0.44))
                    if a > 0:
                        col = over(col, TEAL, a)

                    acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2]
            n = SS * SS
            out += bytes((
                max(0, min(255, int(round(acc[0] / n)))),
                max(0, min(255, int(round(acc[1] / n)))),
                max(0, min(255, int(round(acc[2] / n)))),
                255))
    return bytes(out)


def write_png(path, N, raw):
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n"
                + chunk(b"IHDR", struct.pack(">IIBBBBB", N, N, 8, 6, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(raw, 9))
                + chunk(b"IEND", b""))


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.join(here, "assets")
    os.makedirs(out, exist_ok=True)
    for N in (192, 512):
        write_png(os.path.join(out, "icon-%d.png" % N), N, render(N))
        print("wrote icon-%d.png" % N)


if __name__ == "__main__":
    main()
