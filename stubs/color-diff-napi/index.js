export class ColorDiff {
  constructor() {}
  diff() { return []; }
}

export class ColorFile {
  constructor(content, language) {
    this.content = content;
    this.language = language;
  }
}

export function getSyntaxTheme() {
  return {};
}

export default { ColorDiff, ColorFile, getSyntaxTheme };
