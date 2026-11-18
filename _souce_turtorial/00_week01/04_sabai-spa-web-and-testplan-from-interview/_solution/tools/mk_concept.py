import json
R = 'C:/t/spa04/raw'
STY = ("Photorealistic, cinematic, shot on a full-frame DSLR, soft natural light, true-to-life colours, emotional documentary-style storytelling, "
       "set in a chic contemporary Thai hotel spa with teak wood, brass and orchids unless stated otherwise. Fictional people only, all adults, no celebrity likeness. "
       "Absolutely no readable text, no letters, no numbers, no logo, no watermark anywhere; any paper, screen or sign must show only abstract lines, blocks or blank areas.")
OW = f"{R}/people/owner-chan.png"
TE = f"{R}/lesson/tester-aim.png"
RB = f"{R}/lesson/robot-ref.png"
J = []


def add(n, p, refs=None, size='16:9 wide landscape'):
    j = dict(name=n, out=f"{R}/lesson/{n}.png", size=size, prompt=p + " " + STY)
    if refs:
        j['refs'] = refs
    J.append(j)


TX = "the young Thai woman tester from the reference photo (same face, smart casual shirt, lanyard)"
OX = "the elegant spa founder from the reference photo (same face, same green silk jacket)"
RX = "small white AI helper robots exactly like the one in the reference photo"
add('c-listen', f"{OX} talking warmly while {TX} listens and writes in a notebook, at a teak table with tea, sticky notes on the table, sense of careful listening.", [OW, TE])
add('c-questions', f"{TX} on a video call on a laptop, holding a list of questions with many blank sticky notes on a wall, {OX} visible on the laptop screen answering and holding a menu booklet.", [OW, TE])
add('c-story-wall', f"{TX} arranging many coloured blank sticky notes on a teak wall in rows, with printed photos of different customers (office woman, tourist, couple) pinned above the rows.", [TE])
add('c-three-trays', f"Top-down view of a teak desk with three brass trays holding sorted paper cards, hands of a tester placing a card; a green tray, a gold tray and a blue tray, blank cards, calculator and a stopwatch beside them.")
add('c-boundary', f"Extreme close-up of a brass ruler with a fine gold line and three small coloured markers placed just before, exactly on, and just after the line on cream paper, dramatic shallow depth of field, concept of an exact boundary.")
add('c-blueprint', f"{TX} and a young engineer leaning over a large blueprint table covered with abstract system diagrams, boxes and arrows, in a spa meeting room, {OX} pointing at one box and asking a question.", [OW, TE])
add('c-architecture', "Miniature photorealistic scale model on a teak table: a tiny Thai spa house connected by a glowing thread to two small glowing server cubes, one rose-gold, one blue, on small model whales' backs in a shallow tray of water, a laptop behind it, whimsical tilt-shift photography.")
add('c-erd', "Top-down view of many small cream index cards laid on a dark teak table, connected by red string and brass pins like a detective board, cards have only abstract lines, an old leather ledger beside them, moody light, concept of database tables and relationships.")
add('c-sequence', f"Relay handoff scene at the spa reception: a customer's hand with a phone, a receptionist in modern sage-green Thai silk uniform, and a ledger keeper, passing a single golden booking card from hand to hand in a line, motion feeling, concept of a sequence of messages.")
add('c-race', "Two different hands reaching at the same moment for one single brass room key on a teak reception counter, dramatic tension, shallow depth of field.")
add('c-stamp', f"{OX} pressing a gold wax seal stamp onto a printed data sheet, satisfied expression, {TX} watching, warm light.", [OW, TE])
add('c-meta', f"{TX} carefully reading a long printed paper scroll of instructions with a pen, one small white AI robot on the desk holding the other end of the scroll, laptop closed beside them.", [TE, RB])
add('c-newwindow', f"{TX} opening a brand new laptop on a clean empty desk, one small white AI robot on the desk looking fresh and ready holding one single rolled document; in the blurred background another robot exhausted under piles of paper.", [TE, RB])
add('c-build', f"Workshop table with {RX} assembling a beautiful miniature Thai spa house and tiny website screen panels, tiny cranes, warm workshop light, magical but realistic tilt-shift photo.", [RB])
add('c-wait', f"{TX} relaxing with a cup of blue butterfly-pea tea in a garden sala while a laptop nearby shows an abstract progress bar, calm waiting mood.", [TE])
add('c-three-voices', f"{TX} stands in the middle holding a clipboard, comparing: on the left {OX} speaking, in the centre a small white AI robot holding a thick document, on the right a large screen showing an abstract website. Three-way comparison composition.", [OW, TE, RB])
add('c-recon', f"A small white AI robot wearing a tiny explorer hat walking through a miniature model of a Thai spa with a flashlight and a small map, looking into rooms, tilt-shift photo.", [RB])
add('c-charter', f"{TX} handing out mission cards to a row of seven {RX} standing on a teak table in a line, each one receiving a differently coloured blank card, a large abstract map of a spa on the wall.", [TE, RB])
add('c-parallel', f"Long teak table with seven {RX} each working at its own tiny laptop showing different abstract web pages, each writing in its own small notebook; {TX} supervising from behind with a tablet. Busy productive scene.", [TE, RB])
add('c-collision', f"Two {RX} tugging at the same single brass room key with a lotus tag, in front of a door, comedic tension; a third robot holding a big red reset button behind them while others look shocked.", [RB])
add('c-writeasgo', f"Close-up of a small white AI robot writing line by line in a small notebook with a tiny pen beside a browser screen with green check marks, the notebook already half filled with neat abstract lines.", [RB])
add('c-merge', "Seven small coloured notebooks on a teak table being bound together by careful hands into one thick handsome leather-bound book, glue brush, thread, warm light.")
add('c-judge', f"One small white AI robot wearing a tiny judge's collar alone in a quiet separate room, holding a small gavel, reading a single neat paper list, with three rubber stamps in red, orange and grey on the desk.", [RB])
add('c-writers', f"Eight {RX} seated along a long library table each writing a separate chapter, stacks of neat pages, {TX} checking ID numbers on a master binder.", [TE, RB])
add('c-tc-card', "Close-up of a single beautifully designed paper test card clipped to a clipboard, many ruled empty fields, a fountain pen writing on it, brass paperclip, shallow depth of field.")
add('c-review', f"A small white AI robot with a red pen marking up pages written by another robot, red circles and small notes, the author robot watching nervously from the side, library setting.", [RB])
add('c-bake', "Inside a warm kitchen: a small white AI robot copying a value from a tablet screen onto a recipe card while a perfect-looking cake in the oven has a tiny ladybug hidden on top; a shocked young woman tester pointing from the doorway.", [RB, TE])
add('c-oracle-scale', f"A brass balance scale on a teak table: one pan holds a signed document with a gold seal, heavier and lower; the other pan holds a phone showing a screenshot, lighter and higher, {TX} observing.", [TE])
add('c-test-run', f"Two small white AI robots sprinting side by side on running lanes in front of a desktop monitor and a phone on a stand both showing an abstract spa website, a film strip of frames flying above them, cinematic motion blur.", [RB])
add('c-evidence', f"{TX} presenting a tablet with an abstract dashboard to {OX}, who looks closely and asks a serious question, spa office, evidence folders on the table.", [OW, TE])
add('c-bughunt', "Macro shot: a large brass magnifying glass over a printed price receipt on a spa reception counter, revealing a tiny ladybug sitting right on a price line, another ladybug on a small calendar behind, dramatic light.")
add('c-who-wrong', f"{TX} at a stone garden crossroads in a Thai spa garden, holding a clipboard and looking at three brass signposts with blank plates pointing in different directions.", [TE])
add('c-team', f"Celebration photo: {TX} and {OX} with the spa team in modern sage-green Thai silk uniforms and a small white AI robot, high-five in a circle in the garden, joy, golden hour.", [OW, TE, RB])
add('c-one-input', f"{TX} placing one single sheet of paper into a beautiful teak and brass machine; on a conveyor belt behind it emerge neat documents, blueprints, a miniature spa model and a report tablet, magical realism.", [TE])
add('c-testable', f"Three-part still life on one teak table: a big red push button with a small reset icon shape, a small paper tag tied to a button, and a brass desk calendar locked with a small padlock, soft light, conceptual photography.")
json.dump(J, open('C:/t/spa04/imgwork/concept.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
base = [
    dict(name='tester-aim', out=TE, size='portrait 2:3', prompt="Brand portrait, waist-up, 85mm: a smart, cute young Thai woman aged 25, software tester, friendly focused smile, smart casual shirt, company lanyard with blank card, holding a slim notebook, modern office softly blurred. " + STY),
    dict(name='robot-ref', out=RB, size='1:1 square', prompt="Studio product photo of a small friendly humanoid desktop AI helper robot about 25 cm tall, glossy white shell, dark face screen with two simple glowing eyes, soft sage-green and gold accents, standing on a teak table, realistic materials, photorealistic. " + STY),
]
json.dump(base, open('C:/t/spa04/imgwork/concept0.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(J))
