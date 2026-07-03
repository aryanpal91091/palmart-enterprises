import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
}

// Check localStorage or default system color scheme
const initialTheme = (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';

if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

const initialState: UiState = {
  theme: initialTheme,
  sidebarOpen: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = nextTheme;
      localStorage.setItem('theme', nextTheme);
      
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      if (action.payload === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    },
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
  },
});

export const { toggleTheme, setTheme, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
