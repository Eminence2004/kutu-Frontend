export const BASE_URL = "https://kutu-gh.duckdns.org";

// ── Auth & Profile ────────────────────────────────────────────────────────
export const API = {
  // Auth
  login:           `${BASE_URL}/api/auth/login/`,
  signup:          `${BASE_URL}/api/auth/signup/`,

  // Profile
  profile:         `${BASE_URL}/api/auth/profile/`,
  profileUpdate:   `${BASE_URL}/api/auth/profile/update/`,

  // Posts
  posts:           `${BASE_URL}/api/auth/posts/`,
  myPosts:         `${BASE_URL}/api/auth/posts/mine/`,
  likePost:        (id: number) => `${BASE_URL}/api/auth/posts/${id}/like/`,
  postComments:    (id: number) => `${BASE_URL}/api/auth/posts/${id}/comments/`,

  // Social
  userSearch:      `${BASE_URL}/api/auth/users/search/`,
  userDetail:      (id: number) => `${BASE_URL}/api/auth/users/${id}/`,
  followUser:      (id: number) => `${BASE_URL}/api/auth/users/${id}/follow/`,

  // Chat
  chatList:        `${BASE_URL}/api/auth/chat/`,
  privateChat:     (id: number) => `${BASE_URL}/api/auth/chat/${id}/`,

  // ID Card Finder
  findStudent:     `${BASE_URL}/api/auth/find-student/`,
  sendContact:     `${BASE_URL}/api/auth/contact-request/send/`,
  contactInbox:    `${BASE_URL}/api/auth/contact-request/inbox/`,
  respondContact:  `${BASE_URL}/api/auth/contact-request/respond/`,

  // Navigation
  navLocations:    `${BASE_URL}/api/navigation/locations/`,
  navSearch:       (q: string) => `${BASE_URL}/api/navigation/search/?q=${encodeURIComponent(q)}`,
  navRoute:        (fromId: number, toId: number) => `${BASE_URL}/api/navigation/route/?start_id=${fromId}&end_id=${toId}`,
  navNearestGate:  (lat: number, lon: number, destId: number) => `${BASE_URL}/api/navigation/nearest-gate/?lat=${lat}&lon=${lon}&destination_id=${destId}`,
  navGates:        `${BASE_URL}/api/navigation/gates/`,
  washroomsNearby: (lat: number, lon: number, radius = 400) => `${BASE_URL}/api/navigation/washrooms/nearby/?lat=${lat}&lon=${lon}&radius=${radius}`,
  washroomsAll:    `${BASE_URL}/api/navigation/washrooms/`,
};

// Helper — builds full media URL from a relative path
export const mediaUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
};    