import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskForm from '../TaskForm';

vi.mock('../ui/dialog', () => ({
  Dialog: ({ children, open }) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }) => <div>{children}</div>,
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}));

vi.mock('../ui/form', () => ({
  Form: ({ children }) => <form>{children}</form>,
  FormField: ({ children, render }) => render ? render({ field: {} }) : children,
  FormItem: ({ children }) => <div>{children}</div>,
  FormLabel: ({ children }) => <label>{children}</label>,
  FormControl: ({ children }) => <div>{children}</div>,
  FormMessage: ({ children }) => children ? <span className="error">{children}</span> : null,
}));

vi.mock('../ui/input', () => ({
  Input: ({ placeholder, ...props }) => <input placeholder={placeholder} {...props} />,
}));

vi.mock('../ui/textarea', () => ({
  Textarea: ({ placeholder, ...props }) => <textarea placeholder={placeholder} {...props} />,
}));

vi.mock('../ui/select', () => ({
  Select: ({ children, onValueChange, value }) => (
    <select onChange={(e) => onValueChange?.(e.target.value)} value={value}>
      {children}
    </select>
  ),
  SelectContent: ({ children }) => <>{children}</>,
  SelectItem: ({ children, value }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }) => <div>{children}</div>,
  SelectValue: ({ placeholder }) => <span>{placeholder}</span>,
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, type, variant }) => (
    <button onClick={onClick} type={type} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock('../RecurrenceSelector', () => ({
  default: ({ value, onChange }) => (
    <div data-testid="recurrence-selector">
      <button onClick={() => onChange({ type: 'daily', interval: 1 })}>
        Set Daily
      </button>
    </div>
  ),
}));

vi.mock('../UserSelector', () => ({
  default: ({ value, onChange, users }) => (
    <select 
      data-testid="user-selector" 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select user</option>
      {users?.map(user => (
        <option key={user._id} value={user._id}>{user.fullName}</option>
      ))}
    </select>
  ),
}));

describe('TaskForm', () => {
  const mockCategories = [
    { _id: 'cat1', name: 'Work', color: '#3b82f6' },
    { _id: 'cat2', name: 'Personal', color: '#10b981' }
  ];

  const mockUsers = [
    { _id: 'user1', fullName: 'John Doe', email: 'john@example.com' },
    { _id: 'user2', fullName: 'Jane Smith', email: 'jane@example.com' }
  ];

  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn(),
    categories: mockCategories,
    users: mockUsers,
    currentUser: mockUsers[0]
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(<TaskForm {...mockProps} />);
    
    expect(screen.getByPlaceholderText('Enter task title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter task description')).toBeInTheDocument();
    expect(screen.getByTestId('user-selector')).toBeInTheDocument();
    expect(screen.getByTestId('recurrence-selector')).toBeInTheDocument();
  });

  it('shows "Create Task" title when creating new task', () => {
    render(<TaskForm {...mockProps} />);
    
    expect(screen.getByText('Create Task')).toBeInTheDocument();
  });

  it('shows "Edit Task" title when editing existing task', () => {
    const editTask = {
      _id: '1',
      title: 'Existing Task',
      description: 'Existing description',
      priority: 'medium',
      category: 'cat1'
    };

    render(<TaskForm {...mockProps} task={editTask} />);
    
    expect(screen.getByText('Edit Task')).toBeInTheDocument();
  });

  it('populates form with existing task data', () => {
    const editTask = {
      _id: '1',
      title: 'Existing Task',
      description: 'Existing description',
      priority: 'medium',
      category: 'cat1'
    };

    render(<TaskForm {...mockProps} task={editTask} />);
    
    expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
  });

  it('submits form with correct data', async () => {
    const user = userEvent.setup();
    render(<TaskForm {...mockProps} />);
    
    await user.type(screen.getByPlaceholderText('Enter task title'), 'New Task');
    await user.type(screen.getByPlaceholderText('Enter task description'), 'New description');
    
    const submitButton = screen.getByRole('button', { name: /create task/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Task',
          description: 'New description'
        })
      );
    });
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<TaskForm {...mockProps} />);
    
    const submitButton = screen.getByRole('button', { name: /create task/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
    });
  });

  it('handles category selection', async () => {
    const user = userEvent.setup();
    render(<TaskForm {...mockProps} />);
    
    const categorySelect = screen.getByRole('combobox');
    await user.selectOptions(categorySelect, 'cat1');
    
    expect(categorySelect.value).toBe('cat1');
  });

  it('handles assignee selection', async () => {
    const user = userEvent.setup();
    render(<TaskForm {...mockProps} />);
    
    const userSelector = screen.getByTestId('user-selector');
    await user.selectOptions(userSelector, 'user2');
    
    expect(userSelector.value).toBe('user2');
  });

  it('handles recurrence pattern selection', async () => {
    const user = userEvent.setup();
    render(<TaskForm {...mockProps} />);
    
    const recurrenceButton = screen.getByText('Set Daily');
    await user.click(recurrenceButton);
    
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskForm {...mockProps} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('resets form when closed and reopened', () => {
    const { rerender } = render(<TaskForm {...mockProps} isOpen={false} />);
    
    rerender(<TaskForm {...mockProps} isOpen={true} />);
    
    expect(screen.getByPlaceholderText('Enter task title')).toHaveValue('');
    expect(screen.getByPlaceholderText('Enter task description')).toHaveValue('');
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    
    const slowSubmit = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<TaskForm {...mockProps} onSubmit={slowSubmit} />);
    
    await user.type(screen.getByPlaceholderText('Enter task title'), 'New Task');
    
    const submitButton = screen.getByRole('button', { name: /create task/i });
    await user.click(submitButton);
    
    expect(screen.getByText(/creating/i)).toBeInTheDocument();
  });
});