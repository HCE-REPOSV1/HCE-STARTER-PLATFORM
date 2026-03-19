export const getUser = () => localStorage.getItem('jarvis_user');
export const setUser = (u: string) => localStorage.setItem('jarvis_user', u);
export const clearUser = () => localStorage.removeItem('jarvis_user');
export const isAuthenticated = () => !!getUser();
