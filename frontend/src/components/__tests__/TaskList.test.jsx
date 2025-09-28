import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TaskList from '../TaskList';

vi.mock('../TaskCard', () => ({
  default: ({ task, onStatusChange, onEdit, onDelete, onClick }) => (
    <div data-testid={`task-${task._id}`}>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <span>{task.status}</span>
      <button onClick={() => onStatusChange(task._id, 'in_progress')}>
        Change Status
      </button>
      <button onClick={() => onEdit(task)}>Edit</button>
      <button onClick={() => onDelete(task._id)}>Delete</button>
      <button onClick={() => onClick(task)}>View Details</button>
    </div>
  ),
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, onClick, variant }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}));

describe('TaskList', () => {
  const mockTasks = [
    {
      _id: '1',
      title: 'Task 1',
      description: 'First task',
      status: 'todo',
      priority: 'high',
      category: { name: 'Work', color: '#3b82f6' },
      owner: { _id: 'user1', fullName: 'John Doe' },
      dueDate: '2024-12-31T23:59:59.000Z'
    },
    {
      _id: '2',
      title: 'Task 2',
      description: 'Second task',
      status: 'in_progress',
      priority: 'medium',
      category: { name: 'Personal', color: '#10b981' },
      owner: { _id: 'user1', fullName: 'John Doe' },
      dueDate: '2024-12-30T23:59:59.000Z'
    },
    {
      _id: '3',
      title: 'Task 3',
      description: 'Third task',
      status: 'done',
      priority: 'low',
      category: { name: 'Work', color: '#3b82f6' },
      owner: { _id: 'user1', fullName: 'John Doe' }
    }
  ];

  const mockProps = {
    tasks: mockTasks,
    onStatusChange: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onTaskClick: vi.fn(),
    currentUser: { _id: 'user1', fullName: 'John Doe' },
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMasks();
  });

  it('renders all tasks correctly', () => {
    render(<TaskList {...mockProps} />);
    
    expect(screen.getByTestId('task-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-2')).toBeInTheDocument();
    expect(screen.getByTestId('task-3')).toBeInTheDocument();
    
    expect(screen.getByText('Task 1')).toBeInTheDocument();
    expect(screen.getByText('Task 2')).toBeInTheDocument();
    expect(screen.getByText('Task 3')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(<TaskList {...mockProps} tasks={[]} />);
    
    expect(screen.getByText(/no tasks found/i)).toBeInTheDocument();
    expect(screen.getByText(/create your first task/i)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<TaskList {...mockProps} loading={true} />);
    
    expect(screen.getByText(/loading tasks/i)).toBeInTheDocument();
  });

  it('groups tasks by status correctly', () => {
    render(<TaskList {...mockProps} groupBy="status" />);
    
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('groups tasks by category correctly', () => {
    render(<TaskList {...mockProps} groupBy="category" />);
    
    expect(screen.getByText('Work')).toBeInTheDocument();
    expect(screen.getByText('Personal')).toBeInTheDocument();
  });

  it('groups tasks by priority correctly', () => {
    render(<TaskList {...mockProps} groupBy="priority" />);
    
    expect(screen.getByText('High Priority')).toBeInTheDocument();
    expect(screen.getByText('Medium Priority')).toBeInTheDocument();
    expect(screen.getByText('Low Priority')).toBeInTheDocument();
  });

  it('calls onStatusChange when task status is changed', () => {
    render(<TaskList {...mockProps} />);
    
    const changeStatusButton = screen.getAllByText('Change Status')[0];
    fireEvent.click(changeStatusButton);
    
    expect(mockProps.onStatusChange).toHaveBeenCalledWith('1', 'in_progress');
  });

  it('calls onEdit when task edit is clicked', () => {
    render(<TaskList {...mockProps} />);
    
    const editButton = screen.getAllByText('Edit')[0];
    fireEvent.click(editButton);
    
    expect(mockProps.onEdit).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('calls onDelete when task delete is clicked', () => {
    render(<TaskList {...mockProps} />);
    
    const deleteButton = screen.getAllByText('Delete')[0];
    fireEvent.click(deleteButton);
    
    expect(mockProps.onDelete).toHaveBeenCalledWith('1');
  });

  it('calls onTaskClick when task is clicked', () => {
    render(<TaskList {...mockProps} />);
    
    const viewDetailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(viewDetailsButton);
    
    expect(mockProps.onTaskClick).toHaveBeenCalledWith(mockTasks[0]);
  });

  it('sorts tasks by due date correctly', () => {
    render(<TaskList {...mockProps} sortBy="dueDate" />);
    
    const taskElements = screen.getAllByTestId(/task-/);
    
    expect(taskElements[0]).toHaveAttribute('data-testid', 'task-2');
    expect(taskElements[1]).toHaveAttribute('data-testid', 'task-1');
  });

  it('sorts tasks by priority correctly', () => {
    render(<TaskList {...mockProps} sortBy="priority" />);
    
    const taskElements = screen.getAllByTestId(/task-/);
    
    expect(taskElements[0]).toHaveAttribute('data-testid', 'task-1');
  });

  it('filters tasks correctly', () => {
    const filteredTasks = mockTasks.filter(task => task.status === 'todo');
    
    render(<TaskList {...mockProps} tasks={filteredTasks} />);
    
    expect(screen.getByTestId('task-1')).toBeInTheDocument();
    expect(screen.queryByTestId('task-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('task-3')).not.toBeInTheDocument();
  });

  it('shows task count correctly', () => {
    render(<TaskList {...mockProps} showCount={true} />);
    
    expect(screen.getByText('3 tasks')).toBeInTheDocument();
  });

  it('handles empty category gracefully', () => {
    const tasksWithoutCategory = [
      {
        ...mockTasks[0],
        category: null
      }
    ];
    
    render(<TaskList {...mockProps} tasks={tasksWithoutCategory} groupBy="category" />);
    
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('shows overdue indicator for overdue tasks', () => {
    const overdueTasks = [
      {
        ...mockTasks[0],
        dueDate: '2020-01-01T00:00:00.000Z' // Past date
      }
    ];
    
    render(<TaskList {...mockProps} tasks={overdueTasks} />);
    
    expect(screen.getByText(/overdue/i)).toBeInTheDocument();
  });
});