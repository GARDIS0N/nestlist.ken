export const LISTING_FEES: Record<string, number> = {
  single_room: 100,
  bedsitter:   200,
  studio:      250,
  '1br':       500,
  '2br':       700,
  '3br':       1000,
  '4br':       1200,
  '5br_plus':  1500,
};

export const TYPE_LABELS: Record<string, string> = {
  single_room: 'Single Room',
  bedsitter:   'Bedsitter',
  studio:      'Studio Apartment',
  '1br':       '1 Bedroom',
  '2br':       '2 Bedroom',
  '3br':       '3 Bedroom',
  '4br':       '4 Bedroom',
  '5br_plus':  '5+ Bedroom',
};

export const TYPE_EMOJIS: Record<string, string> = {
  single_room: '\u{1F6CF}',
  bedsitter:   '\u{1F3E0}',
  studio:      '\u{1F3D9}\uFE0F',
  '1br':       '\u{1F3E1}',
  '2br':       '\u{1F3D8}\uFE0F',
  '3br':       '\u{1F3F0}',
  '4br':       '\u{1F3EF}',
  '5br_plus':  '\u{1F3DB}\uFE0F',
};

export const AMENITIES = [
  'Water 24/7', 'Borehole', 'Parking',
  'Security Guard', 'CCTV', 'Electric Fence',
  'Backup Generator', 'WiFi Ready', 'DSTV Ready',
  'Tiled Floors', 'Servant Quarter', 'Garden',
  'Balcony', 'Near Tarmac', 'Near School',
  'Near Shopping Centre', 'Furnished',
  'Pet Friendly', 'Gated Community', 'Swimming Pool',
];

export const KENYAN_COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru',
  'Eldoret', 'Kericho', 'Nyeri', 'Thika',
  'Kitale', 'Machakos', 'Kisii', 'Meru',
  'Kakamega', 'Uasin Gishu', 'Kiambu',
  "Murang'a", 'Kajiado', 'Kilifi', 'Kwale',
  'Narok', 'Bomet', 'Nandi', 'Trans Nzoia',
  'Bungoma', 'Busia', 'Siaya', 'Homa Bay',
  'Migori', 'Nyamira', 'Kirinyaga', 'Embu',
  'Tharaka Nithi', 'Isiolo', 'Marsabit',
  'Turkana', 'West Pokot', 'Samburu',
  'Laikipia', 'Nyandarua', 'Baringo',
  'Elgeyo Marakwet', 'Vihiga', 'Taita Taveta',
  'Tana River', 'Lamu', 'Garissa', 'Wajir',
  'Mandera', 'Other',
];

export const NAIROBI_ESTATES = [
  'Kilimani', 'Westlands', 'Karen', 'Lavington',
  'Kileleshwa', 'Kasarani', 'Ruaka', 'Ngong Road',
  'South B', 'South C', 'Eastleigh', "Lang'ata",
  'Embakasi', 'Donholm', 'Umoja', 'Zimmerman',
  'Roysambu', 'Kahawa West', 'Parklands', 'Upperhill',
  'Hurlingham', 'Kilimani', 'Runda', 'Muthaiga',
  'Spring Valley', 'Gigiri', 'Ridgeways', 'Loresho',
];

export const ROLE_LABELS: Record<string, string> = {
  landlord:    'Landlord',
  caretaker:   'Caretaker',
  agent:       'Agent',
  tenant:      'Tenant',
  admin:       'Admin',
  superadmin:  'Super Admin',
};

export const LISTING_DURATION_DAYS = 30;
export const MAX_PHOTOS = 8;
export const MAX_PHOTO_SIZE_MB = 5;
export const API_URL = import.meta.env.VITE_API_URL
  || 'https://nestlist-server.onrender.com';
