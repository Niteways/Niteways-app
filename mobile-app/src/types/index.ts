export interface User {
    id: number | string;
    username?: string; // fallback
    name?: string; // fallback
    firstName?: string;
    lastName?: string;
    userCode?: string;
    email: string;
    mobile: string;
    birthday?: string;
    fcmToken?: string;
    createdAt: string;
}

export interface Nightclub {
    id: number;
    name: string;
    description: string;
    address: string;
    city: string;
    imageUrl: string;
    galleryImages?: string[]; // Added gallery support
    rating?: number;
    priceLevel?: string; // '$', '$$', '$$$'
    category?: string; // 'Nightclub', 'Bar', etc.
    tags?: string[];
    latitude?: number;
    longitude?: number;
}

export interface Event {
    id: number;
    nightclubId: number;
    name: string;
    description: string;
    eventDate: string;
    eventTime: string;
    price: number;
}

export interface SignUpResponse {
    message: string;
    mobile: string;
    mockCode?: string;
}


export interface SignUpData {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    password: string;
}

export interface AuthResponse {
    accessToken: string;
    user: User;
}

export type RootStackParamList = {
    Splash: undefined;
    Welcome: undefined;
    VenueSignUp: undefined;
    VenuePortal: undefined;
    SignUp: undefined;
    Verification: { mobile: string };
    Login: undefined;
    Main: undefined;
    Profile: undefined;
    EditProfile: undefined;
    About: undefined;
    Security: undefined;
    Terms: undefined;
    HelpSupport: undefined;
    Bookings: undefined;
    BookingDetail: { booking: any };
    Browse: undefined;
    ClubEvents: { club: { id: string; name: string; description: string; location: string; imageUrl?: string } };
    Map: undefined;
    Notifications: undefined;
};

export interface VenueTable {
    id: string;
    venueId: number;
    label: string; // "T1", "VIP 1"
    capacity: number;
    basePrice: number;
    depositPercent: number;
    requiresApproval: boolean;
    x?: number; // For floor plan (0-100)
    y?: number; // For floor plan (0-100)
    width?: number; // For floor plan
    height?: number; // For floor plan
    isAvailable?: boolean;
}

export interface TableBooking {
    id: string;
    venueId: number;
    tableId: string;
    userId: number | string;
    bookingDate: string;
    bookingTime: string;
    guestCount: number;
    notes?: string;
    status: 'pending' | 'confirmed' | 'cancelled';
    totalPrice: number;
    depositAmount: number;
}
