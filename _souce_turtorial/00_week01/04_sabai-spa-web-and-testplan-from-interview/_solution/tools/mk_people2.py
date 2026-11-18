import json
R = 'C:/t/spa04/raw'
STY = ("Photorealistic, shot on a full-frame DSLR, soft flattering natural light, true-to-life colours, natural skin texture, "
       "luxury 5-star hotel spa brand campaign photography. Fictional people only, all clearly adults in their twenties, no celebrity likeness. "
       "Absolutely no text, no letters, no logo, no watermark anywhere in the image.")
UNI_F = ("wearing a modern Thai-inspired luxury hotel spa uniform: a tailored mandarin-collar top in soft sage green Thai silk with a slim gold sash, "
         "elegant wrap skirt-pants, modest and stylish")
UNI_M = ("wearing a modern Thai-inspired luxury hotel spa uniform: a tailored mandarin-collar raj-pattern jacket in soft sage green Thai silk with slim gold piping, "
         "slim trousers, modest and stylish")
BG = "Softly blurred background: a chic contemporary Thai hotel spa with warm teak, brass and orchids."
OW = f"{R}/people/owner-chan.png"
J = []


def add(n, sub, size, p, refs=None):
    j = dict(name=n, out=f"{R}/{sub}/{n}.png", size=size, prompt=p + " " + STY)
    if refs:
        j['refs'] = refs
    J.append(j)


add('owner-chan', 'people', 'portrait 2:3',
    "Environmental portrait 85mm f/1.8: a stylish, beautiful Thai woman aged about 38, young founder of a boutique Thai hotel spa in Bangkok, "
    "in a modern fitted Thai silk jacket in deep banana-leaf green with a small gold brooch, sleek hair, warm confident smile. " + BG + " Adult woman in her late thirties.")
staff = [
    ('staff-t01-sri', "a beautiful Thai woman aged 28, head therapist, confident sweet smile, sleek low bun", UNI_F),
    ('staff-t02-malee', "a pretty Thai woman aged 26, friendly bright smile, shoulder-length hair neatly tied", UNI_F),
    ('staff-t03-phum', "a handsome, cute Thai man aged 27, boyish friendly smile, short stylish hair, clean-shaven", UNI_M),
    ('staff-t04-fah', "a lovely Thai woman aged 22, newly graduated junior therapist, cute cheerful smile, long hair in a neat ponytail", UNI_F),
    ('staff-t05-tiw', "a good-looking Thai man aged 25, gentle charming smile, neat modern K-style hair", UNI_M),
    ('staff-t06-kaew', "a cute Thai woman aged 24, lively dimpled smile, hair in a braided bun with a tiny jasmine sprig", UNI_F),
    ('staff-bua', "a beautiful Thai receptionist woman aged 24, warm welcoming smile, performing a graceful Thai wai greeting with both palms together", UNI_F),
]
for n, d, u in staff:
    add(n, 'people', 'portrait 2:3', f"Professional brand portrait, waist-up, 85mm f/2: {d}, {u}. {BG}")
SHOP = "A chic contemporary Thai hotel spa in Bangkok with teak, brass and a lush lotus garden."
add('owner-herbs', 'shop', '3:2 landscape', "The same woman as in the reference photo (same face, same green silk jacket), standing in the spa herb garden, selecting fresh lemongrass into a rattan basket, looking at camera with a warm smile, morning light.", [OW])
add('owner-interview', 'shop', '3:2 landscape', "The same woman as in the reference photo (same face, same green silk jacket), seated at a teak table in her spa talking and gesturing warmly to a young analyst whose back is partly to camera, notebook and laptop on the table, candid documentary style.", [OW])
refs = [OW] + [f"{R}/people/{n}.png" for n, _, _ in staff]
add('team-group', 'shop', '3:2 landscape', f"Group brand photo in front of the teak spa entrance. Use the people in the reference photos, keeping each face: the founder in the centre in her green silk jacket, surrounded by her five young women and two young men staff in matching modern sage-green Thai silk uniforms, all smiling warmly, palms together in a Thai wai. {SHOP}", refs)
F = "a young Thai woman therapist aged about 25 in a modern sage-green Thai silk spa uniform"
M = "a young handsome Thai man therapist aged about 26 in a modern sage-green Thai silk spa uniform"
svc = {
    'svc-s01-thai60': f"{F} giving traditional Thai massage to a fully clothed client (loose Thai massage outfit) on a floor mat, gentle shoulder stretch, luxury hotel spa room",
    'svc-s02-thai90': f"{M} giving a traditional Thai back stretch to a fully clothed client in a loose Thai outfit on a floor mat in a teak room",
    'svc-k01-contour': f"{F} measuring a smiling fit client's waist with a soft tape over her fitted sports top in a bright clean treatment room, friendly and professional, tasteful",
}
for n, d in svc.items():
    add(n, 'services', '3:2 landscape', d + ".")
add('welcome-tea', 'shop', '1:1 square', "A young Thai woman receptionist in a modern sage-green Thai silk uniform offering a small cup of butterfly-pea tea with a jasmine garland on a brass tray, smiling, shallow depth of field, luxury hotel spa lobby.")
json.dump(J, open('C:/t/spa04/imgwork/people2.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(J))
