export class ColorDiff {
  constructor() {}
  diff() { return []; }
  render() { return null; }
}

export class ColorFile {
  constructor(content, language) {
    this.content = content;
    this.language = language;
  }
  render() { return null; }
}

export function getSyntaxTheme() {
  return {};
}

export default { ColorDiff, ColorFile, getSyntaxTheme };
