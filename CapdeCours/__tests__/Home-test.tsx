import React from 'react';
import { render } from '@testing-library/react-native';
import Home from '../app/(main layout)/home/index';

jest.mock('@/utils/asyncStorage', () => ({
  getData: jest.fn(() => Promise.resolve(JSON.stringify(['calendar-1']))),
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock('lucide-react-native', () => ({
  CalendarPlus: 'CalendarPlus',
}));

jest.mock('date-fns', () => {
  const actualDateFns = jest.requireActual('date-fns');
  return {
    ...actualDateFns,
    startOfWeek: jest.fn(() => new Date(2024, 0, 1)),
    addDays: jest.fn((date, days) => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    }),
    format: jest.fn((date, formatStr) => {
      if (formatStr === 'EEEEEE') {
        const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
        return days[date.getDay()];
      }
      if (formatStr === 'd') {
        return date.getDate().toString();
      }
      return date.toString();
    }),
    isToday: jest.fn(() => false),
  };
});

describe('Home Screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with welcome message', () => {
    const { getByText } = render(<Home />);

    expect(getByText('Welcome back!')).toBeTruthy();
  });

  it('displays today schedule section', () => {
    const { getByText } = render(<Home />);

    expect(getByText('Today schedule')).toBeTruthy();
  });

  it('renders schedule items with correct times', () => {
    const { getByText } = render(<Home />);

    expect(getByText('08.00')).toBeTruthy();
    expect(getByText('10.00')).toBeTruthy();
    expect(getByText('12.00')).toBeTruthy();
    expect(getByText('14.00')).toBeTruthy();
    expect(getByText('16.00')).toBeTruthy();
  });

  it('displays Machine learning class at 08.00', () => {
    const { getByText } = render(<Home />);

    expect(getByText('Machine learning')).toBeTruthy();
  });

  it('displays Deep learning class at 12.00', () => {
    const { getByText } = render(<Home />);

    expect(getByText('Deep learning')).toBeTruthy();
  });

  it('renders bottom section with call-to-action text', () => {
    const { getByText } = render(<Home />);

    expect(getByText('Classify unorganized images now!')).toBeTruthy();
  });

  it('displays schedule with proper structure', () => {
    const { getByText } = render(<Home />);

    expect(getByText('08.00')).toBeTruthy();
    expect(getByText('10.00')).toBeTruthy();
    expect(getByText('12.00')).toBeTruthy();

    expect(getByText('Machine learning')).toBeTruthy();
    expect(getByText('Deep learning')).toBeTruthy();
  });

  it('renders images in bottom section', () => {
    const { UNSAFE_root } = render(<Home />);

    const images = UNSAFE_root.findAllByType('Image');

    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('has correct styling classes for main sections', () => {
    const { getByText } = render(<Home />);

    const welcomeText = getByText('Welcome back!');
    expect(welcomeText.props.className).toContain('text-xl');
    expect(welcomeText.props.className).toContain('font-bold');

    const scheduleTitle = getByText('Today schedule');
    expect(scheduleTitle.props.className).toContain('text-xl');
    expect(scheduleTitle.props.className).toContain('font-bold');
  });

  it('renders schedule items in correct order', () => {
    const { getByText } = render(<Home />);

    const times = ['08.00', '10.00', '12.00', '14.00', '16.00'];
    times.forEach((time) => {
      expect(getByText(time)).toBeTruthy();
    });
  });

  it('displays class blocks with correct content', () => {
    const { getByText } = render(<Home />);

    const mlClass = getByText('Machine learning');
    const dlClass = getByText('Deep learning');

    expect(mlClass).toBeTruthy();
    expect(dlClass).toBeTruthy();
    expect(mlClass.props.className).toContain('text-white');
    expect(dlClass.props.className).toContain('text-white');
  });
});
