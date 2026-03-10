export function getLocationPlaceholders() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";

  if (tz.includes("Africa/Mogadishu")) {
    return {
      phone: "+252 63 4123456",
      address: "Hargeisa, Somaliland",
    };
  }

  if (tz.includes("America")) {
    return {
      phone: "+1 303 555 0123",
      address: "Denver, Colorado",
    };
  }

  if (tz.includes("Europe")) {
    return {
      phone: "+44 7700 900123",
      address: "London, UK",
    };
  }

  return {
    phone: "+123 456 789",
    address: "Enter your address",
  };
}