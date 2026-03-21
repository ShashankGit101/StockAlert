import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuthStore } from "@/store/authStore";

// AsyncStorage is auto-mocked by jest-expo via the RN mock setup
beforeEach(() => {
  jest.clearAllMocks();
  // Reset store state between tests
  useAuthStore.setState({ token: null, user: null, hydrated: false });
});

describe("setToken", () => {
  it("persists token to AsyncStorage and updates state", async () => {
    await useAuthStore.getState().setToken("mytoken");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("access_token", "mytoken");
    expect(useAuthStore.getState().token).toBe("mytoken");
  });
});

describe("clearToken", () => {
  it("removes token from AsyncStorage and clears state", async () => {
    useAuthStore.setState({ token: "tok", user: { id: 1, email: "a@b.com", expo_push_token: null } });
    await useAuthStore.getState().clearToken();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("access_token");
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
  });
});

describe("loadToken", () => {
  it("loads token from AsyncStorage and sets hydrated=true", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("storedToken");
    await useAuthStore.getState().loadToken();
    expect(useAuthStore.getState().token).toBe("storedToken");
    expect(useAuthStore.getState().hydrated).toBe(true);
  });

  it("sets token=null and hydrated=true when nothing stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    await useAuthStore.getState().loadToken();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().hydrated).toBe(true);
  });
});

describe("setUser", () => {
  it("updates user in state", () => {
    const user = { id: 5, email: "x@y.com", expo_push_token: "tok" };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
  });
});
