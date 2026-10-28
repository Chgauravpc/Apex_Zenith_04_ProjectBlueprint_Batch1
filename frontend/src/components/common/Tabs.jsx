import React, { createContext, useContext, useState } from 'react';

const TabsContext = createContext({
  activeTab: '',
  setActiveTab: () => {},
});

/**
 * Google & 21st.dev style Segmented Pill Tabs.
 */
export function Tabs({
  value,
  defaultValue,
  onValueChange,
  children,
  className = '',
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const activeTab = value !== undefined ? value : internalValue;

  const handleTabChange = (val) => {
    if (value === undefined) {
      setInternalValue(val);
    }
    if (onValueChange) {
      onValueChange(val);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '', 'aria-label': ariaLabel }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center p-1 bg-[#F1F3F4] rounded-xl border border-[#E2E8F0] shadow-xs gap-1 max-w-full overflow-x-auto ${className}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  disabled = false,
  icon = null,
  className = '',
}) {
  const { activeTab, setActiveTab } = useContext(TabsContext);
  const isSelected = activeTab === value;

  return (
    <button
      role="tab"
      type="button"
      disabled={disabled}
      aria-selected={isSelected}
      onClick={() => setActiveTab(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-all duration-150 outline-none select-none disabled:opacity-40 disabled:cursor-not-allowed ${
        isSelected
          ? 'bg-white text-maroon-800 shadow-xs border border-[#DADCE0] font-semibold'
          : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 border border-transparent'
      } ${className}`}
    >
      {icon && <span className="mr-1.5 inline-flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
}

export function TabsContent({ value, children, className = '' }) {
  const { activeTab } = useContext(TabsContext);
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={`mt-4 outline-none focus-visible:ring-2 focus-visible:ring-maroon-700 rounded-xl ${className}`}
    >
      {children}
    </div>
  );
}

export default Tabs;
