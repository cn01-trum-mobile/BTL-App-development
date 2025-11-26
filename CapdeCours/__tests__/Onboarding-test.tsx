import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Onboarding from '../app/(custom layout)/onboarding/index';
import { router } from 'expo-router';
import * as asyncStorage from '@/utils/asyncStorage';

jest.mock('expo-router', () => ({
    router: {
        replace: jest.fn(),
    },
}));

jest.mock('@/utils/asyncStorage', () => ({
    storeData: jest.fn(),
}));


jest.mock('react-native-worklets', () => ({
    scheduleOnRN: (fn: any) => fn(),
    createSerializable: (v: any) => v,
    makeShareable: (v: any) => v,
    makeShareableCloneRecursive: (v: any) => v,
    registerWorklet: () => { },
}));


jest.mock('react-native-reanimated', () => {
    return {
        __esModule: true,
        default: {
            View: (props: any) => props.children,
        },
        useSharedValue: (initial: any) => ({ value: initial }),
        useAnimatedStyle: (fn: any) => (fn ? fn() : {}),
        withTiming: (v: any) => v,
    };
});

jest.mock('react-native-gesture-handler', () => {
    const View = require('react-native').View;
    const panInstances: any[] = [];
    return {
        Gesture: {
            Pan: () => {
                const obj: any = {};
                obj.onChange = (cb: any) => {
                    obj._onChange = cb;
                    return obj;
                };
                obj.onEnd = (cb: any) => {
                    obj._onEnd = cb;
                    return obj;
                };
                panInstances.push(obj);
                return obj;
            },
            Simultaneous: jest.fn().mockReturnValue({}),
        },
        GestureDetector: ({ children }: any) => children,
        GestureHandlerRootView: View,
        __panInstances: panInstances,
    };
});

describe('Onboarding Screen', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('skips onboarding when Skip button is pressed', async () => {
        const { getByText } = render(<Onboarding />);

        fireEvent.press(getByText('Skip'));

        await waitFor(() => {
            expect(asyncStorage.storeData).toHaveBeenCalledWith('onboarded', '1');
            expect(router.replace).toHaveBeenCalledWith('/home');
        });
    });

    it('advances to next screen when Next button is pressed', async () => {
        const { getByText } = render(<Onboarding />);

        fireEvent.press(getByText('Next'));

        await waitFor(() => {
            expect(getByText('Prev')).toBeTruthy();
        });
    });

    it('goes back to previous screen when Prev button is pressed', async () => {
        const { getByText } = render(<Onboarding />);

        fireEvent.press(getByText('Next'));

        await waitFor(() => {
            expect(getByText('Prev')).toBeTruthy();
        });

        fireEvent.press(getByText('Prev'));

        await waitFor(() => {
            expect(() => getByText('Prev')).toThrow();
        });
    });

    it('shows Start button on last screen', async () => {
        const { getByText } = render(<Onboarding />);

        fireEvent.press(getByText('Next'));
        fireEvent.press(getByText('Next'));
        fireEvent.press(getByText('Next'));

        await waitFor(() => {
            expect(getByText('Start')).toBeTruthy();
        });
    });

    it('completes onboarding when Start button is pressed on last screen', async () => {
        const { getByText } = render(<Onboarding />);

        fireEvent.press(getByText('Next'));
        fireEvent.press(getByText('Next'));
        fireEvent.press(getByText('Next'));

        await waitFor(() => {
            expect(getByText('Start')).toBeTruthy();
        });

        fireEvent.press(getByText('Start'));

        await waitFor(() => {
            expect(asyncStorage.storeData).toHaveBeenCalledWith('onboarded', '1');
            expect(router.replace).toHaveBeenCalledWith('/home');
        });
    });

    it('does not show Prev button on first screen', () => {
        const { queryByText } = render(<Onboarding />);
        expect(queryByText('Prev')).toBeNull();
    });

    it('navigates through all screens correctly', async () => {
        const { getByText, queryByText } = render(<Onboarding />);

        expect(queryByText('Prev')).toBeNull();
        expect(getByText('Next')).toBeTruthy();

        fireEvent.press(getByText('Next'));
        await waitFor(() => {
            expect(getByText('Prev')).toBeTruthy();
            expect(getByText('Next')).toBeTruthy();
        });

        fireEvent.press(getByText('Next'));
        await waitFor(() => {
            expect(getByText('Prev')).toBeTruthy();
            expect(getByText('Next')).toBeTruthy();
        });

        fireEvent.press(getByText('Next'));
        await waitFor(() => {
            expect(getByText('Prev')).toBeTruthy();
            expect(getByText('Start')).toBeTruthy();
        });

        fireEvent.press(getByText('Prev'));
        await waitFor(() => {
            expect(getByText('Next')).toBeTruthy();
        });
    });

    it('triggers swipe gestures to change screens', async () => {
        const gesture = require('react-native-gesture-handler');
        const { __panInstances } = gesture;

        const { getByText, queryByText } = render(<Onboarding />);

        expect(queryByText('Prev')).toBeNull();

        await waitFor(() => {
            expect(__panInstances.length).toBeGreaterThanOrEqual(2);
        });

        const swipeInst = __panInstances.find((p: any) => p && typeof p._onEnd === 'function');
        expect(swipeInst).toBeDefined();

        swipeInst._onEnd({ translationX: -100 });
        swipeInst._onEnd({ translationX: 100 });
    });

    it('handles drag gesture change and end branches', async () => {
        const gesture = require('react-native-gesture-handler');
        const { __panInstances } = gesture;

        const { getByText } = render(<Onboarding />);

        const drag = __panInstances[1];
        expect(drag._onChange).toBeDefined();
        expect(drag._onEnd).toBeDefined();

        drag._onChange({ changeX: -50 });

        drag._onEnd();
        fireEvent.press(getByText('Next'));
        await waitFor(() => {
            expect(getByText('Prev')).toBeTruthy();
        });
    });

});
