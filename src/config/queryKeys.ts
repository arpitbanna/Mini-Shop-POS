export const queryKeys = {
  sales: {
    all: ['sales'] as const,
  },
  inventory: {
    all: ['inventory'] as const,
  },
  purchases: {
    all: ['purchases'] as const,
  },
  expenses: {
    all: ['expenses'] as const,
  },
};

export const queryConfig = {
  staleTimeMs: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
};
