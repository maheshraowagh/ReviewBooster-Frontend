export interface CategoryConfig {
  key: string;
  displayName: string;
  icon: string;
  settings: {
    sectionTitle: string;
    hint: string;
    inputPlaceholder: string;
    bulkPlaceholder: string;
    footnote: string;
  };
  review: {
    promptLabel: string;
    promptPlaceholder: string;
  };
  presets: string[];
  showGroupSize: boolean;
}

export const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  restaurant: {
    key: 'restaurant',
    displayName: 'Restaurant & Dining',
    icon: '🍽️',
    settings: {
      sectionTitle: 'Menu items',
      hint: 'Add your signature dishes so customers can tap to recommend them when leaving a review.',
      inputPlaceholder: 'e.g. KitKat Shake, Butter Chicken',
      bulkPlaceholder: 'Butter Chicken\nPaneer Tikka\nCold Coffee\n\n...or: Butter Chicken, Paneer Tikka, Cold Coffee',
      footnote: 'These appear as tap-to-select chips in your customer review flow.',
    },
    review: {
      promptLabel: 'What did you order?',
      promptPlaceholder: 'e.g. Paneer Tikka, Cold Coffee',
    },
    presets: [
      'Butter Chicken',
      'Paneer Tikka',
      'Cold Coffee',
      'Margherita Pizza',
      'White Sauce Pasta',
      'KitKat Shake',
      'Biryani',
      'Garlic Naan',
      'Chocolate Brownie',
      'Virgin Mojito',
    ],
    showGroupSize: true,
  },
  cafe: {
    key: 'cafe',
    displayName: 'Café & Coffee',
    icon: '☕',
    settings: {
      sectionTitle: 'Menu & Beverages',
      hint: 'Add your popular coffees, teas, and snacks for quick customer recommendations.',
      inputPlaceholder: 'e.g. Cappuccino, Avocado Toast',
      bulkPlaceholder: 'Cappuccino\nEspresso\nAvocado Toast\nBlueberry Muffin',
      footnote: 'These appear as tap-to-select chips in your customer review flow.',
    },
    review: {
      promptLabel: 'What did you order?',
      promptPlaceholder: 'e.g. Cappuccino, Sandwich',
    },
    presets: [
      'Cappuccino',
      'Iced Latte',
      'Espresso',
      'Avocado Toast',
      'Croissant',
      'Matcha Latte',
      'Club Sandwich',
      'Blueberry Muffin',
      'Hot Chocolate',
      'Cheesecake',
    ],
    showGroupSize: true,
  },
  bakery: {
    key: 'bakery',
    displayName: 'Bakery & Desserts',
    icon: '🥖',
    settings: {
      sectionTitle: 'Fresh Bakes & Cakes',
      hint: 'Add your breads, pastries, and custom cakes so customers can highlight their favorites.',
      inputPlaceholder: 'e.g. Chocolate Tart, Sourdough Bread',
      bulkPlaceholder: 'Sourdough Bread\nChocolate Tart\nRed Velvet Cake\nButter Croissant',
      footnote: 'These appear as tap-to-select chips in your customer review flow.',
    },
    review: {
      promptLabel: 'What did you get?',
      promptPlaceholder: 'e.g. Croissant, Brownie, Custom Cake',
    },
    presets: [
      'Chocolate Cake',
      'Red Velvet Slice',
      'Butter Croissant',
      'Sourdough Loaf',
      'Macarons',
      'Fruit Tart',
      'Brownie',
      'Cupcakes',
      'Cinnamon Roll',
      'Custom Birthday Cake',
    ],
    showGroupSize: true,
  },
  salon: {
    key: 'salon',
    displayName: 'Salon & Barber',
    icon: '✂️',
    settings: {
      sectionTitle: 'Services offered',
      hint: 'Add your haircut, styling, and grooming services so clients can tag what they got done.',
      inputPlaceholder: 'e.g. Haircut & Styling, Hair Colour',
      bulkPlaceholder: 'Haircut & Styling\nHair Colour\nFacial Treatment\nBeard Trim\nKeratin Treatment',
      footnote: 'These appear as tap-to-select chips in your client review flow.',
    },
    review: {
      promptLabel: 'What did you have done?',
      promptPlaceholder: 'e.g. Haircut, Hair Colour, Facial',
    },
    presets: [
      'Haircut & Styling',
      'Hair Colouring',
      'Beard Grooming',
      'Facial Treatment',
      'Keratin Treatment',
      'Hair Spa',
      'Manicure',
      'Pedicure',
      'Threading & Waxing',
      'Head Massage',
    ],
    showGroupSize: false,
  },
  spa: {
    key: 'spa',
    displayName: 'Spa & Wellness',
    icon: '🧖',
    settings: {
      sectionTitle: 'Treatments offered',
      hint: 'Add your massages, therapy packages, and spa treatments for clients to recommend.',
      inputPlaceholder: 'e.g. Deep Tissue Massage, Aromatherapy',
      bulkPlaceholder: 'Deep Tissue Massage\nAromatherapy\nBody Scrub\nHot Stone Therapy\nFoot Reflexology',
      footnote: 'These appear as tap-to-select chips in your client review flow.',
    },
    review: {
      promptLabel: 'What treatment did you have?',
      promptPlaceholder: 'e.g. Deep Tissue Massage, Aromatherapy',
    },
    presets: [
      'Deep Tissue Massage',
      'Swedish Massage',
      'Aromatherapy',
      'Body Scrub & Wrap',
      'Hot Stone Therapy',
      'Foot Reflexology',
      'Steam & Sauna Session',
      'Detox Facial',
      'Couples Massage',
      'Ayurvedic Therapy',
    ],
    showGroupSize: true,
  },
  gym: {
    key: 'gym',
    displayName: 'Gym & Fitness',
    icon: '🏋️',
    settings: {
      sectionTitle: 'Facilities & Classes',
      hint: 'Add your workout zones, fitness classes, and personal training options.',
      inputPlaceholder: 'e.g. Personal Training, Yoga Class',
      bulkPlaceholder: 'Personal Training\nCrossFit\nYoga Class\nCardio Zone\nSpinning Class',
      footnote: 'These appear as tap-to-select chips in your member review flow.',
    },
    review: {
      promptLabel: 'What class or facility did you use?',
      promptPlaceholder: 'e.g. Personal Training, Yoga Class, Cardio Zone',
    },
    presets: [
      'Personal Training',
      'CrossFit',
      'Yoga Class',
      'Spinning Class',
      'Zumba',
      'Free Weights Area',
      'Cardio Zone',
      'Steam & Sauna',
      'Pilates Session',
      'Boxing Conditioning',
    ],
    showGroupSize: false,
  },
  clinic: {
    key: 'clinic',
    displayName: 'Medical & Dental',
    icon: '🏥',
    settings: {
      sectionTitle: 'Services offered',
      hint: 'Add your consultation, diagnostic, and specialty treatments for patients to highlight.',
      inputPlaceholder: 'e.g. Dental Cleaning, Eye Checkup',
      bulkPlaceholder: 'Dental Cleaning\nTeeth Whitening\nGeneral Consultation\nEye Checkup\nPhysiotherapy',
      footnote: 'These appear as tap-to-select chips in your patient review flow.',
    },
    review: {
      promptLabel: 'What service did you receive?',
      promptPlaceholder: 'e.g. Dental Cleaning, Consultation, Eye Checkup',
    },
    presets: [
      'General Consultation',
      'Dental Cleaning',
      'Teeth Whitening',
      'Eye Checkup',
      'Physiotherapy Session',
      'Blood Tests',
      'Skin Care Consultation',
      'Root Canal Treatment',
      'Health Checkup Package',
      'Orthodontic Alignment',
    ],
    showGroupSize: false,
  },
  hotel: {
    key: 'hotel',
    displayName: 'Hotel & Hospitality',
    icon: '🏨',
    settings: {
      sectionTitle: 'Rooms & Amenities',
      hint: 'Add your room types, dining experiences, and guest amenities.',
      inputPlaceholder: 'e.g. Deluxe Suite, Rooftop Pool',
      bulkPlaceholder: 'Deluxe Room\nExecutive Suite\nRooftop Pool\nBuffet Breakfast\nAirport Transfer',
      footnote: 'These appear as tap-to-select chips in your guest review flow.',
    },
    review: {
      promptLabel: 'What room or amenity did you enjoy?',
      promptPlaceholder: 'e.g. Executive Suite, Rooftop Pool, Buffet Breakfast',
    },
    presets: [
      'Deluxe Room',
      'Executive Suite',
      'Rooftop Pool',
      'Buffet Breakfast',
      'Spa & Wellness Access',
      'Fitness Center',
      'Room Service',
      'Airport Shuttle',
      'Ocean View Balcony',
      'Conference Room',
    ],
    showGroupSize: true,
  },
  retail: {
    key: 'retail',
    displayName: 'Retail & Store',
    icon: '🛒',
    settings: {
      sectionTitle: 'Product categories',
      hint: 'Add key product categories or bestseller items so shoppers can mention what they bought.',
      inputPlaceholder: 'e.g. Designer Wear, Skincare',
      bulkPlaceholder: 'Apparel & Clothing\nFootwear\nSkincare & Cosmetics\nHome Decor\nAccessories',
      footnote: 'These appear as tap-to-select chips in your customer review flow.',
    },
    review: {
      promptLabel: 'What did you buy?',
      promptPlaceholder: 'e.g. Footwear, Skincare, Electronics',
    },
    presets: [
      'Apparel & Clothing',
      'Footwear & Shoes',
      'Skincare & Cosmetics',
      'Handbags & Wallets',
      'Jewelry & Accessories',
      'Home Decor',
      'Electronics & Gadgets',
      'Organic Products',
      'Perfumes & Fragrances',
      'Gift Cards',
    ],
    showGroupSize: false,
  },
  automotive: {
    key: 'automotive',
    displayName: 'Auto Repair & Detailing',
    icon: '🚗',
    settings: {
      sectionTitle: 'Services & Packages',
      hint: 'Add vehicle maintenance, washing, and detailing services offered.',
      inputPlaceholder: 'e.g. Full Car Wash, Oil Change',
      bulkPlaceholder: 'Full Car Wash\nOil Change\nCeramic Coating\nTire Alignment\nBrake Service',
      footnote: 'These appear as tap-to-select chips in your customer review flow.',
    },
    review: {
      promptLabel: 'What service was done?',
      promptPlaceholder: 'e.g. Oil Change, Full Detailing, Wheel Alignment',
    },
    presets: [
      'Full Car Wash',
      'Interior Detailing',
      'Oil & Filter Change',
      'Ceramic Coating',
      'Wheel Alignment & Balancing',
      'Brake Inspection & Repair',
      'AC Service & Gas Top-up',
      'Paint Protection Film (PPF)',
      'Engine Diagnostics',
      'Battery Replacement',
    ],
    showGroupSize: false,
  },
  agency: {
    key: 'agency',
    displayName: 'Services & Agency',
    icon: '💼',
    settings: {
      sectionTitle: 'Services & Solutions',
      hint: 'Add key service packages or solutions delivered to clients.',
      inputPlaceholder: 'e.g. SEO Audit, Web Development',
      bulkPlaceholder: 'Web Design & Development\nSEO Optimization\nSocial Media Marketing\nBrand Identity\nPPC Advertising',
      footnote: 'These appear as tap-to-select chips in your client review flow.',
    },
    review: {
      promptLabel: 'What service did we provide?',
      promptPlaceholder: 'e.g. SEO Audit, Website Redesign, Branding',
    },
    presets: [
      'Web Design & Development',
      'SEO Audit & Strategy',
      'Social Media Management',
      'Branding & Logo Design',
      'PPC & Google Ads',
      'Content Marketing',
      'Email Marketing Campaign',
      'UI/UX Design',
      'Consulting Session',
      'App Development',
    ],
    showGroupSize: false,
  },
  generic: {
    key: 'generic',
    displayName: 'General Business',
    icon: '🏢',
    settings: {
      sectionTitle: 'Services & Offerings',
      hint: 'Add your main services or products so customers can tap to select them in their review.',
      inputPlaceholder: 'e.g. Consultation, Premium Service',
      bulkPlaceholder: 'Standard Consultation\nPremium Package\nCustom Order\nOn-site Service',
      footnote: 'These appear as tap-to-select chips in your customer review flow.',
    },
    review: {
      promptLabel: 'What service or product did you get?',
      promptPlaceholder: 'e.g. Consultation, Service Package',
    },
    presets: [
      'Standard Consultation',
      'Premium Service Package',
      'Custom Solution',
      'Maintenance & Support',
      'On-site Visit',
      'Express Service',
    ],
    showGroupSize: false,
  },
};

/**
  * Safely resolve category config for any given business type string.
  * Case-insensitive, handles aliases (e.g., 'barber' -> 'salon', 'dentist' -> 'clinic').
  */
export function getCategoryConfig(businessType?: string | null): CategoryConfig {
  if (!businessType) return CATEGORY_CONFIGS.generic;

  const normalized = businessType.toLowerCase().trim();

  // Direct match
  if (CATEGORY_CONFIGS[normalized]) {
    return CATEGORY_CONFIGS[normalized];
  }

  // Alias checks
  if (normalized.includes('salon') || normalized.includes('barber') || normalized.includes('hair') || normalized.includes('beauty')) {
    return CATEGORY_CONFIGS.salon;
  }
  if (normalized.includes('gym') || normalized.includes('fitness') || normalized.includes('crossfit') || normalized.includes('workout')) {
    return CATEGORY_CONFIGS.gym;
  }
  if (normalized.includes('spa') || normalized.includes('wellness') || normalized.includes('massage')) {
    return CATEGORY_CONFIGS.spa;
  }
  if (normalized.includes('clinic') || normalized.includes('dental') || normalized.includes('doctor') || normalized.includes('health') || normalized.includes('medical')) {
    return CATEGORY_CONFIGS.clinic;
  }
  if (normalized.includes('hotel') || normalized.includes('resort') || normalized.includes('stay') || normalized.includes('inn')) {
    return CATEGORY_CONFIGS.hotel;
  }
  if (normalized.includes('cafe') || normalized.includes('coffee')) {
    return CATEGORY_CONFIGS.cafe;
  }
  if (normalized.includes('bakery') || normalized.includes('cake') || normalized.includes('pastry')) {
    return CATEGORY_CONFIGS.bakery;
  }
  if (normalized.includes('restaurant') || normalized.includes('diner') || normalized.includes('food') || normalized.includes('bistro') || normalized.includes('bar')) {
    return CATEGORY_CONFIGS.restaurant;
  }
  if (normalized.includes('retail') || normalized.includes('store') || normalized.includes('shop') || normalized.includes('boutique')) {
    return CATEGORY_CONFIGS.retail;
  }
  if (normalized.includes('auto') || normalized.includes('car') || normalized.includes('garage') || normalized.includes('repair')) {
    return CATEGORY_CONFIGS.automotive;
  }
  if (normalized.includes('agency') || normalized.includes('tech') || normalized.includes('software') || normalized.includes('consulting') || normalized.includes('digital')) {
    return CATEGORY_CONFIGS.agency;
  }

  return CATEGORY_CONFIGS.generic;
}

export const ALL_CATEGORY_LIST = Object.values(CATEGORY_CONFIGS).filter((c) => c.key !== 'generic');
