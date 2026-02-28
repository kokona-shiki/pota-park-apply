function stripSuffix(name: string): string {
  return name.replace(/省|市|自治区|壮族|回族|维吾尔/g, '');
}

function containsPlace(name: string, place: string): boolean {
  if (!place) return false;
  return name.includes(place) || name.includes(stripSuffix(place));
}

export function buildDisplayName(
  name: string,
  province?: string,
  city?: string
): string {
  let prefix = '';

  if (province && !containsPlace(name, province)) {
    prefix += stripSuffix(province);
  }

  if (city && !containsPlace(name, city)) {
    prefix += stripSuffix(city);
  }

  return prefix + name;
}
