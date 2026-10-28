"""フェイクマイク用の声っぽい音(倍音つき・軽いビブラート)を作る。使い方: python3 make_tone.py 220 out.wav"""
import math, struct, sys, wave
f0, out = float(sys.argv[1]), sys.argv[2]
sr, sec = 48000, 6
with wave.open(out, "w") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    ph, fr = 0.0, bytearray()
    for i in range(sr * sec):
        t = i / sr
        ph += 2 * math.pi * f0 * (1 + 0.004 * math.sin(2 * math.pi * 5 * t)) / sr
        v = sum(a * math.sin(h * ph) for h, a in ((1, .6), (2, .5), (3, .3), (4, .15), (5, .08)))
        fr += struct.pack("<h", int(max(-1, min(1, v * .5)) * 30000))
    w.writeframes(bytes(fr))
