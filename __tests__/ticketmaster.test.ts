import { fetchTicketmasterEvents } from '../lib/ticketmaster';

const mockTMResponse = {
  _embedded: {
    events: [
      {
        id: 'test-123',
        name: 'Barry Manilow Concert',
        url: 'https://www.ticketmaster.co.uk/event/123',
        dates: {
          start: {
            localDate: '2026-06-13',
            localTime: '19:00:00',
          },
        },
        images: [],
        _embedded: {
          venues: [
            {
              name: 'M&S Bank Arena Liverpool',
              city: { name: 'Liverpool' },
              location: {
                latitude: '53.3975',
                longitude: '-2.9917',
              },
            },
          ],
        },
        classifications: [
          {
            segment: { name: 'Music' },
            genre: { name: 'Pop' },
          },
        ],
      },
      {
        id: 'test-456',
        name: 'Football Match',
        url: 'https://www.ticketmaster.co.uk/event/456',
        dates: {
          start: {
            localDate: '2026-06-14',
          },
        },
        images: [],
        _embedded: {
          venues: [
            {
              name: 'Anfield',
              city: { name: 'Liverpool' },
              location: {
                latitude: '53.4308',
                longitude: '-2.9608',
              },
            },
          ],
        },
        classifications: [
          {
            segment: { name: 'Sports' },
            genre: { name: 'Football' },
          },
        ],
      },
    ],
  },
  page: {
    size: 50,
    totalElements: 2,
    totalPages: 1,
    number: 0,
  },
};

describe('Ticketmaster API', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockTMResponse,
    });
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('fetches and normalizes events', async () => {
    const events = await fetchTicketmasterEvents(
      53.4084,
      -2.9916,
      10,
      '2026-06-13',
      '2026-06-14'
    );

    expect(events.length).toBe(2);

    const concert = events[0];
    expect(concert.id).toContain('tm-');
    expect(concert.title).toBe('Barry Manilow Concert');
    expect(concert.venue).toBe('M&S Bank Arena Liverpool');
    expect(concert.date).toBe('2026-06-13');
    expect(concert.category).toBe('music');
    expect(concert.latitude).toBe(53.3975);
    expect(concert.longitude).toBe(-2.9917);
    expect(concert.estimatedAttendance).toBe(10000); // M&S Bank Arena
    expect(concert.source).toBe('ticketmaster');

    const sports = events[1];
    expect(sports.title).toBe('Football Match');
    expect(sports.venue).toBe('Anfield');
    expect(sports.category).toBe('sports');
    expect(sports.estimatedAttendance).toBe(54000); // Anfield
  });

  test('returns empty array on API failure', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    globalThis.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const events = await fetchTicketmasterEvents(
      53.4084,
      -2.9916,
      10,
      '2026-07-01',
      '2026-07-01'
    );

    expect(events).toEqual([]);
    warn.mockRestore();
  });
});
