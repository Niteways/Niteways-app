export type VenueProfileTab = 'profile' | 'card' | 'menu' | 'security';

export type GuestListKind = 'recurring' | 'oneday';

export type VenuePortalStackParamList = {
    VenueMain: undefined;
    VenueBookingDetail: { bookingId: string };
    VenueUserProfile: { initialTab?: VenueProfileTab };
    VenueNotifications: undefined;
    VenueCreateGuestList: undefined;
    VenueGuestListDetail: { listId: string; listType: GuestListKind };
    VenueGuestListSettings: { listId: string; listType: GuestListKind };
    VenueTicketTypeForm: { mode: 'create' } | { mode: 'edit'; ticketId: string };
    VenueTicketDetail: { ticketId: string };
};
