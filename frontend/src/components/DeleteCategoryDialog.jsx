import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { Badge } from './ui/badge'

const DeleteCategoryDialog = ({ isOpen, onClose, category, onConfirm }) => {
  if (!category) return null

  const hasActiveTasks = category.taskCount > 0

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete the category{' '}
                <span className="font-semibold">&quot;{category.name}&quot;</span>?
              </p>
              
              {hasActiveTasks ? (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Warning</span>
                  </div>
                  <p className="text-sm text-destructive mb-2">
                    This category has{' '}
                    <Badge variant="destructive" className="mx-1">
                      {category.taskCount} active {category.taskCount === 1 ? 'task' : 'tasks'}
                    </Badge>
                    assigned to it.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You cannot delete this category until all tasks are reassigned to other categories or deleted.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. The category will be permanently removed.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {!hasActiveTasks && (
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Category
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default DeleteCategoryDialog