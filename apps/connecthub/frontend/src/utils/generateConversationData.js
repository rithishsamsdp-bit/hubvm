const FIRST_NAMES = [
  "Bunny", "Allan", "John", "Jane", "Maria",
  "Carlos", "Priya", "Arjun", "Sara", "Liam",
  "Emma", "Noah", "Olivia", "Ethan", "Ava"
];
const LAST_NAMES = [
  "Doe", "Smith", "Patel", "Johnson", "Gonzalez",
  "Kumar", "Gupta", "Brown", "Miller", "Davis"
];
const STATUS_LABELS = [
  "OngoingCall", "Active", "OnHold", "YettoStart", "Lead"
];
const INFO_LABELS = [
  "Whatsapp Call", "Phone Call"
];

// helper to get random item from an array
const rand = arr => arr[Math.floor(Math.random() * arr.length)];

// simple random phone-number generator (India-style)
const randomIndianNumber = () =>
  `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;

// avatar-text generator (first letters of first+last)
const getAvatarText = ({ name }) =>
  name
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase();

export const generateConversationData = (count = 100) =>{
  return Array.from({ length: count }, (_, i) => {
    const first = rand(FIRST_NAMES);
    const last = rand(LAST_NAMES);
    const name = `${first} ${last}`;
    const statusLabel = rand(STATUS_LABELS);
    const statusInfoLabel = rand(INFO_LABELS);

    return {
      type: "user",
      status: rand(["Incoming", "Outgoing"]),
      name,
      number: randomIndianNumber(),
      statusLabel,
      statusInfoLabel,
      // you can also pre-compute avatarText if you like:
      avatarText: getAvatarText({ name })
    };
  });
}