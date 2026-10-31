import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ChallengePhoto } from '@/components/challenge-photo';

// jest only lets a mock factory reach variables whose names start with
// "mock", so these carry the prefix.
const mockRequestMediaLibraryPermissionsAsync = jest.fn();
const mockLaunchImageLibraryAsync = jest.fn();
const mockRequestCameraPermissionsAsync = jest.fn();
const mockLaunchCameraAsync = jest.fn();

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: () => mockRequestMediaLibraryPermissionsAsync(),
  launchImageLibraryAsync: (o: unknown) => mockLaunchImageLibraryAsync(o),
  requestCameraPermissionsAsync: () => mockRequestCameraPermissionsAsync(),
  launchCameraAsync: (o: unknown) => mockLaunchCameraAsync(o),
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg' },
  ImageManipulator: {
    manipulate: () => ({
      resize: jest.fn(),
      renderAsync: async () => ({
        saveAsync: async () => ({ uri: 'file:///resized.jpg' }),
      }),
    }),
  },
}));

function setup(props: Partial<React.ComponentProps<typeof ChallengePhoto>> = {}) {
  const onPick = jest.fn();
  const onClear = jest.fn();
  const onPickError = jest.fn();
  return {
    onPick,
    onClear,
    onPickError,
    ui: (
      <ChallengePhoto
        url={null}
        uploading={false}
        error={null}
        onPick={onPick}
        onClear={onClear}
        onPickError={onPickError}
        testID="p"
        {...props}
      />
    ),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: true });
  mockRequestCameraPermissionsAsync.mockResolvedValue({ granted: true });
  mockLaunchImageLibraryAsync.mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///big.heic', width: 4032, height: 3024, mimeType: 'image/heic' }],
  });
});

describe('ChallengePhoto', () => {
  it('says the photo is optional', async () => {
    const { ui } = setup();
    await render(ui);
    expect(screen.getByText('PHOTO — OPTIONAL')).toBeTruthy();
  });

  it('tells the athlete who can see it', async () => {
    // These are minors. The promise on screen has to match the policy.
    const { ui } = setup();
    await render(ui);
    expect(screen.getByText(/Only you can see this/)).toBeTruthy();
  });

  it('hands back a downscaled JPEG rather than the original', async () => {
    const { onPick, ui } = setup();
    await render(ui);
    fireEvent.press(screen.getByTestId('p-library'));
    await waitFor(() =>
      expect(onPick).toHaveBeenCalledWith({ uri: 'file:///resized.jpg', mimeType: 'image/jpeg' })
    );
  });

  it('picks nothing when the athlete cancels', async () => {
    mockLaunchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: [] });
    const { onPick, onPickError, ui } = setup();
    await render(ui);
    fireEvent.press(screen.getByTestId('p-library'));
    await waitFor(() => expect(mockLaunchImageLibraryAsync).toHaveBeenCalled());
    expect(onPick).not.toHaveBeenCalled();
    expect(onPickError).not.toHaveBeenCalled();
  });

  it('says so when permission is refused, instead of looking like a dead button', async () => {
    mockRequestMediaLibraryPermissionsAsync.mockResolvedValue({ granted: false });
    const { onPick, onPickError, ui } = setup();
    await render(ui);
    fireEvent.press(screen.getByTestId('p-library'));
    await waitFor(() => expect(onPickError).toHaveBeenCalledWith(expect.stringMatching(/permission/)));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('reports a picker that throws rather than swallowing it', async () => {
    // An async onPress rejection has nowhere to go, so it is caught and
    // surfaced. This was a silent dead button before it was caught.
    mockLaunchImageLibraryAsync.mockRejectedValue(new Error('Picker unavailable'));
    const { onPickError, ui } = setup();
    await render(ui);
    fireEvent.press(screen.getByTestId('p-library'));
    await waitFor(() => expect(onPickError).toHaveBeenCalledWith('Picker unavailable'));
  });

  it('offers remove only once there is a photo', async () => {
    const { ui } = setup();
    await render(ui);
    expect(screen.queryByTestId('p-remove')).toBeNull();
  });

  it('offers retake, replace and remove once there is one', async () => {
    const { ui } = setup({ url: 'https://signed.example/photo.jpg' });
    await render(ui);
    expect(screen.getByTestId('p-camera')).toBeTruthy();
    expect(screen.getByTestId('p-remove')).toBeTruthy();
    expect(screen.getByTestId('p-image')).toBeTruthy();
  });

  it('clears on remove', async () => {
    const { onClear, ui } = setup({ url: 'https://signed.example/photo.jpg' });
    await render(ui);
    fireEvent.press(screen.getByTestId('p-remove'));
    await waitFor(() => expect(onClear).toHaveBeenCalled());
  });

  it('shows an upload error', async () => {
    const { ui } = setup({ error: 'That file type cannot be uploaded.' });
    await render(ui);
    expect(screen.getByTestId('p-error')).toHaveTextContent(/cannot be uploaded/);
  });

  it('does not pick while an upload is still going', async () => {
    const { onPick, ui } = setup({ uploading: true });
    await render(ui);
    fireEvent.press(screen.getByTestId('p-library'));
    await waitFor(() => expect(mockLaunchImageLibraryAsync).not.toHaveBeenCalled());
    expect(onPick).not.toHaveBeenCalled();
  });
});
