// Mapa: deterministicky identicon z otisku IK (40 §4, 33 §6) -
// 5x5 zrcadlena mrizka + barva, ciste odvozene z hex otisku.
// Neni to kryptografie, jen vizualni kotva identity - nejde zvolit
// ani napodobit (dve "Jany" maji ruzne identikony).

export interface IdenticonSpec {
  /** 25 poli (5x5, radky po sobe) - true = vybarvit. */
  cells: boolean[];
  /** HSL barva odvozena z otisku. */
  color: string;
}

export function identiconSpec(fingerprintHex: string): IdenticonSpec {
  const bytes: number[] = [];
  for (let i = 0; i + 2 <= fingerprintHex.length && bytes.length < 18; i += 2) {
    bytes.push(Number.parseInt(fingerprintHex.slice(i, i + 2), 16));
  }
  if (bytes.length < 18 || bytes.some(Number.isNaN)) {
    throw new Error("Otisk ma spatny tvar.");
  }

  // Leva polovina (sloupce 0-2) z bitu; sloupce 3-4 zrcadlove.
  const cells: boolean[] = new Array<boolean>(25).fill(false);
  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      const bit = ((bytes[row * 3 + col] ?? 0) & 1) === 1;
      cells[row * 5 + col] = bit;
      cells[row * 5 + (4 - col)] = bit;
    }
  }

  const hue = (((bytes[15] ?? 0) << 8) | (bytes[16] ?? 0)) % 360;
  const light = 45 + ((bytes[17] ?? 0) % 20);
  return { cells, color: `hsl(${hue}, 65%, ${light}%)` };
}
