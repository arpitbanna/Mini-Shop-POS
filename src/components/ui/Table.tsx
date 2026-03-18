import type { HTMLAttributes, TableHTMLAttributes } from 'react';

type TableContainerProps = HTMLAttributes<HTMLDivElement>;
type TableProps = TableHTMLAttributes<HTMLTableElement>;

export function TableContainer({ className = '', ...props }: TableContainerProps) {
  return <div className={`w-full overflow-x-auto ${className}`.trim()} {...props} />;
}

export function Table({ className = '', ...props }: TableProps) {
  return <table className={`w-full text-sm ${className}`.trim()} {...props} />;
}
