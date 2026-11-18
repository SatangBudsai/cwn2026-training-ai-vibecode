import json
R = 'C:/t/spa04/raw'
STY = ("Photorealistic, shot on a full-frame DSLR, natural soft light, true-to-life colours, natural skin texture, "
       "high-end Thai wellness magazine editorial. Fictional people only, adults only, no celebrity likeness. "
       "Absolutely no text, no letters, no logo, no watermark anywhere in the image.")
UNI = ("wearing the spa's uniform: a tailored mandarin-collar tunic in soft sage/banana-leaf green Thai silk-cotton "
       "with subtle gold piping, modest and elegant, neat hair")
SHOPBG = "Softly blurred background of a contemporary Thai teak-wood spa with orchids and brass bowls."
SHOP = ("The spa 'Sabai Jai' is a contemporary Thai teak house in a lush Bangkok garden with lotus ponds, "
        "brass accents, banana-leaf green and warm cream palette.")
J = []


def add(n, sub, size, p, refs=None):
    j = dict(name=n, out=f"{R}/{sub}/{n}.png", size=size, prompt=p + " " + STY)
    if refs:
        j['refs'] = refs
    J.append(j)


OW = f"{R}/people/owner-chan.png"
# ---- people
add('owner-chan', 'people', 'portrait 2:3',
    "Environmental portrait 85mm f/1.8: a warm, elegant Thai woman aged about 52, founder of a boutique Thai wellness "
    "spa in Bangkok, in a refined deep banana-leaf green Thai silk jacket with a small gold brooch, hair tied back, "
    "genuine calm smile. " + SHOPBG)
staff = [
    ('staff-t01-sri', "a graceful Thai woman aged 39, senior head therapist, confident kind smile, hair in a low bun"),
    ('staff-t02-malee', "a pretty Thai woman aged 34, friendly bright smile, shoulder-length hair tied back"),
    ('staff-t03-phum', "a handsome fit Thai man aged 33, calm reassuring smile, short neat hair"),
    ('staff-t04-fah', "a lovely young Thai woman aged 24, newly graduated therapist, sweet cheerful smile, long hair in a neat ponytail"),
    ('staff-t05-thip', "a beautiful Thai woman aged 31, serene gentle expression with soft smile, hair in an elegant chignon with a tiny jasmine sprig"),
    ('staff-t06-kaew', "a cute Thai woman aged 27, lively dimpled smile, hair in a braided bun"),
    ('staff-bua', "a beautiful Thai receptionist woman aged 26, warm welcoming smile, performing a gentle Thai wai greeting with both palms together"),
]
for n, d in staff:
    add(n, 'people', 'portrait 2:3', f"Professional staff portrait, waist-up, 85mm f/2: {d}, {UNI}. {SHOPBG}")
add('cust-may', 'people', 'portrait 2:3', "Candid portrait of a Thai office worker woman aged 29, smart blouse, looking tired but hopeful, checking her phone in the evening on a Bangkok street with bokeh city lights.")
add('cust-liwei', 'people', 'portrait 2:3', "Candid portrait of a friendly Chinese male tourist aged 35, casual smart polo shirt, small backpack strap, smiling and looking at his phone in a Bangkok hotel lobby.")
add('cust-tonfon', 'people', '3:2 landscape', "Candid portrait of a loving Thai couple in their early thirties (man and woman) smiling at each other, smart casual anniversary outfits, at a garden restaurant in Bangkok at golden hour.")
add('cust-nida', 'people', 'portrait 2:3', "Portrait of a fit, confident Thai woman aged 41 in stylish athleisure, friendly smile, holding a tablet, bright modern living room.")
add('cust-prae', 'people', 'portrait 2:3', "Portrait of a cheerful young Thai woman aged 23 with clear natural skin and minimal make-up, soft pastel blouse, holding a small glass serum bottle, bright airy room.")
# ---- shop
add('hero-dusk', 'shop', '16:9 wide landscape', f"Cinematic wide establishing shot at blue-hour dusk. {SHOP} Warm lanterns glowing, reflection in the lotus pond, nobody in frame, lots of calm negative space on the left side.")
add('hero-room', 'shop', '16:9 wide landscape', f"Cinematic wide interior of a luxurious Thai massage room: low teak bed with white linen, rolled towels, orchid, floating flowers in a brass bowl, warm side light through wooden louvres, nobody in frame, negative space on the left. {SHOP}")
add('hero-ritual', 'shop', '16:9 wide landscape', "Cinematic wide close-up of a spa ritual table: steaming herbal compress balls, lemongrass, turmeric, kaffir lime, jasmine, butterfly-pea tea, brass bowl, dark teak table, rays of warm light through steam, negative space on the left.")
add('exterior-day', 'shop', '3:2 landscape', f"Bright morning exterior photo of the spa entrance. {SHOP} Stone path, tropical plants, nobody in frame.")
add('lobby', 'shop', '3:2 landscape', f"Welcoming lobby interior with teak reception desk, brass lotus sculpture, rattan seating, orchids, warm light, nobody in frame. {SHOP}")
add('couple-suite', 'shop', '3:2 landscape', f"Romantic Couple Suite interior: two parallel massage beds with white linen and flower petals, private flower bath tub, candles, teak wall, garden view, nobody in frame. {SHOP}")
add('foot-lounge', 'shop', '3:2 landscape', f"Calm foot massage lounge: row of reclining teak armchairs, brass foot basins with floating flowers, garden view, nobody in frame. {SHOP}")
add('herbal-steam', 'shop', '3:2 landscape', f"Traditional Thai herbal steam room in teak and stone, herb bundles, soft steam, warm light, nobody in frame. {SHOP}")
add('herb-bar', 'shop', '3:2 landscape', "Apothecary-style herb bar wall: glass jars of dried Thai herbs, brass scoops, mortars, blank paper tags with no writing, warm light, nobody in frame.")
add('garden-sala', 'shop', '3:2 landscape', f"Thai sala pavilion in the spa garden beside a lotus pond with cushions and tea set, morning sunlight, nobody in frame. {SHOP}")
add('welcome-tea', 'shop', '1:1 square', "Close-up of hands of a spa receptionist in a green silk uniform offering a small cup of butterfly-pea tea with a jasmine garland on a brass tray, shallow depth of field.")
add('owner-herbs', 'shop', '3:2 landscape', "The same woman as in the reference photo (same face, same green silk jacket), standing in the spa herb garden, selecting fresh lemongrass into a rattan basket, looking at camera with calm smile, morning light.", [OW])
add('owner-interview', 'shop', '3:2 landscape', "The same woman as in the reference photo (same face, same green silk jacket), seated at a teak table in her spa talking and gesturing warmly to a young analyst whose back is partly to camera, notebook and laptop on the table, candid documentary style.", [OW])
add('team-group', 'shop', '3:2 landscape', f"Group photo of a spa team in front of the teak spa entrance: the same woman from the reference photo in the centre in her green silk jacket, surrounded by seven staff members (six women and one man) in matching soft sage silk-cotton tunics, all smiling warmly, palms together in a Thai wai. {SHOP}", [OW])
# ---- services
svc = {
    'svc-s01-thai60': "A female therapist in sage tunic giving traditional Thai massage to a fully clothed client (loose Thai massage outfit) on a floor mat, gentle stretching of the shoulder",
    'svc-s02-thai90': "A male therapist in sage tunic giving a traditional Thai back stretch to a fully clothed client in loose Thai outfit on a floor mat in a teak room",
    'svc-s03-compress': "Close view of a therapist pressing a steaming herbal compress ball onto a client's shoulder; client lying face-down, covered by a white towel up to the shoulders, tasteful",
    'svc-s04-aroma': "Therapist's hands giving a calm aroma oil shoulder massage; client lying face-down covered by a white towel up to the shoulders, amber oil bottle and jasmine beside, tasteful",
    'svc-s05-foot': "Therapist's hands giving a foot reflexology massage to a client's foot on a towel, brass basin with flowers, teak lounge",
    'svc-s06-scrub': "A wooden bowl of golden turmeric and tamarind herbal body scrub with honey dripping, being scooped by a therapist's hand beside rolled towels and fresh turmeric, tasteful product still life",
    'svc-s07-facial': "A woman client lying on her back wrapped in a white towel, eyes closed, receiving a herbal aloe and thanaka facial mask applied with a brush by a therapist, serene, tasteful",
    'svc-p01-bangkok-relax': "Luxury package still life: Thai massage outfit folded, herbal compress balls, jasmine garland, tea set on a teak tray with a Bangkok river view softly blurred behind",
    'svc-k01-contour': "Therapist in sage tunic measuring a smiling fit client's waist with a soft tape over her fitted sports top in a bright clean treatment room, friendly and professional, tasteful",
}
for n, d in svc.items():
    add(n, 'services', '3:2 landscape', d + ".")
# ---- herbs
herbs = {
    'herb-phlai': 'fresh phlai (cassumunar ginger) rhizomes, sliced',
    'herb-turmeric': 'fresh turmeric roots and golden powder',
    'herb-lemongrass': 'fresh lemongrass stalks tied with twine',
    'herb-kaffir': 'kaffir lime fruits and leaves',
    'herb-jasmine': 'fresh Thai jasmine buds',
    'herb-tamarind': 'ripe tamarind pods and pulp',
    'herb-honey': 'honey dipper with wild honey',
    'herb-aloe': 'fresh aloe vera leaves cut open',
    'herb-thanaka': 'thanaka wood logs and golden thanaka paste on a stone',
    'herb-ginger': 'fresh young ginger with leaves',
    'herb-camphor': 'white camphor crystals with fresh herbs in a small brass dish',
    'herb-pepper': 'black pepper corns and dried herbs in a mortar',
}
for n, d in herbs.items():
    add(n, 'herbs', '1:1 square', f"Macro still life on dark teak with soft window light: {d}, moody botanical photography.")
# ---- gift cards (art)
gc = {
    'gc-orchid': 'Thai orchids in soft purple and pink on cream with thin gold line art',
    'gc-lotus': 'pink lotus flowers and pads on deep banana-leaf green with gold foil line art',
    'gc-gold': 'luxurious Thai gold-leaf kanok pattern on dark emerald, gold foil texture',
}
for n, d in gc.items():
    add(n, 'giftcard', '3:2 landscape', f"Flat, straight-on premium luxury gift card design artwork filling the whole frame edge to edge, no card mockup, no hands: {d}. Leave a calm empty area in the centre for overlaying text later.")
# ---- misc
add('pano-couple', 'shop', '21:9 ultra wide panoramic (as wide as the tool allows)', f"Seamless 360-style interior panorama of the Couple Suite, wide continuous sweep of the room: teak walls, two massage beds, flower bath, garden window, lanterns, wardrobe, door; left and right edges should match in tone. Nobody in frame. {SHOP}")
add('skin-sample', 'misc', '1:1 square', "Straight-on bare-face beauty close-up of a fictional young Thai woman aged about 25, neutral expression, even soft light on a pale background, hair pulled back, clean skin with natural pores and a few small marks.")
add('mood-stress', 'misc', '3:2 landscape', "A Thai woman in office clothes at dusk leaving a Bangkok skyscraper, rubbing her temple, soft bokeh, relatable, tasteful.")
add('mood-tired', 'misc', '3:2 landscape', "Close-up of tired bare feet beside taken-off high heels under an office desk at evening, warm light, tasteful.")
add('mood-achy', 'misc', '3:2 landscape', "A woman in a blouse holding her stiff neck in front of a laptop, side light.")
add('mood-glow', 'misc', '3:2 landscape', "A radiant Thai woman with fresh glowing skin in a white robe smiling beside a window after a spa treatment, airy light, tasteful.")
add('login-side', 'misc', 'portrait 2:3', "Vertical shot: orchid and jasmine in a brass bowl on a teak table, candle light, steam, moody and calm.")
add('empty-state', 'misc', '3:2 landscape', "Minimal calm still life: a single lotus flower floating in a brass bowl on cream linen, lots of empty negative space.")
add('review-bg', 'misc', '16:9 wide landscape', "Soft-focus Thai spa garden with lanterns at night, dark tones, heavy bokeh, suitable as a dark section background.")
json.dump(J, open('C:/t/spa04/imgwork/brand.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(J))
