/** Create a collision-resistant local id without requiring a secure context. */
export const createProgramId = (
  now = Date.now(),
  random = Math.random(),
): string =>
  `program-${now.toString(36)}-${Math.floor(random * 0x100000000)
    .toString(36)
    .padStart(7, "0")}`;
