#!/usr/bin/env python3
"""Generate Android launcher icons (mipmap densities) for JELAS.
Same original "clear line" mark, rendered at each density. Pure Python.
"""
import math, struct, zlib, os

TEAL = (31, 111, 99)
PAPER = (242, 239, 232)


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
                    a = max(0.0, min(1.0, 0.5 - sd_round_rect(nx, ny, 0.5, 0.5, 0.5, 0.5, 0.235) * N * 0.44))
                    if a > 0:
                        col = over(col, TEAL, a)
                    a = max(0.0, min(1.0, 0.5 - sd_segment(nx, ny, 0.27, 0.5, 0.60, 0.5, 0.031) * N * 0.44))
                    if a > 0:
                        col = over(col, PAPER, a)
                    a = max(0.0, min(1.0, 0.5 - (math.hypot(nx - 0.725, ny - 0.5) - 0.062) * N * 0.44))
                    if a > 0:
                        col = over(col, PAPER, a)
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
    res = os.path.join(here, "app", "src", "main", "res")
    densities = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for name, size in densities.items():
        d = os.path.join(res, "mipmap-" + name)
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, "ic_launcher.png")
        write_png(p, size, render(size))
        print("wrote", p, os.path.getsize(p), "bytes")


if __name__ == "__main__":
    main()
