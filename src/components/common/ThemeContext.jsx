import * as React from 'react';

const ThemeContext = React.createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = React.useState(() => {
    // Check localStorage or system preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('app-theme');
      if (savedTheme) return savedTheme;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    return 'dark';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Apply theme to document element
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('app-theme', theme);
      
      // Smooth transition effect
      document.documentElement.classList.add('theme-transition');
      const timer = setTimeout(() => {
        document.documentElement.classList.remove('theme-transition');
      }, 400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
