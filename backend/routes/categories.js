import express from 'express';
import { Category, Task } from '../models/index.js';
import { categoryCreateSchema, categoryUpdateSchema } from '../../shared/schemas/category.js';
import { authenticateToken as auth } from '../middleware/auth.js';
import { logCategoryActivity } from '../utils/activityService.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(auth);

// GET /api/categories - Get all categories for authenticated user
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ owner: req.user.id })
      .sort({ name: 1 });
    
    // Manually calculate task count for each category
    const categoriesWithTaskCount = await Promise.all(
      categories.map(async (category) => {
        const taskCount = await Task.countDocuments({ category: category._id });
        return {
          ...category.toObject(),
          taskCount
        };
      })
    );
    
    res.json(categoriesWithTaskCount);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch categories',
      message: error.message 
    });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    // Validate request body
    const validatedData = categoryCreateSchema.parse(req.body);
    
    // Check if category name already exists for this user
    const existingCategory = await Category.findOne({
      owner: req.user.id,
      name: validatedData.name
    });
    
    if (existingCategory) {
      return res.status(400).json({
        error: 'Category already exists',
        message: 'A category with this name already exists'
      });
    }
    
    // Create new category
    const category = new Category({
      ...validatedData,
      owner: req.user.id
    });
    
    await category.save();
    await category.populate('taskCount');
    
    // Log activity
    await logCategoryActivity(
      'category_created',
      req.user.id,
      category._id,
      `Created category "${category.name}"`,
      { color: category.color }
    );
    
    res.status(201).json(category);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Please check the form fields and try again',
        details: error.errors
      });
    }
    
    console.error('Create category error:', error);
    res.status(500).json({ 
      error: 'Failed to create category',
      message: error.message 
    });
  }
});

// PUT /api/categories/:id - Update category
router.put('/:id', async (req, res) => {
  try {
    // Validate request body
    const validatedData = categoryUpdateSchema.parse(req.body);
    
    // Find category and verify ownership
    const category = await Category.findOne({
      _id: req.params.id,
      owner: req.user.id
    });
    
    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
        message: 'Category not found or you do not have permission to edit it'
      });
    }
    
    // Check if new name conflicts with existing category
    if (validatedData.name && validatedData.name !== category.name) {
      const existingCategory = await Category.findOne({
        owner: req.user.id,
        name: validatedData.name,
        _id: { $ne: req.params.id }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          error: 'Category name already exists',
          message: 'A category with this name already exists'
        });
      }
    }
    
    // Update category
    Object.assign(category, validatedData);
    await category.save();
    await category.populate('taskCount');
    
    // Log activity
    await logCategoryActivity(
      'category_updated',
      req.user.id,
      category._id,
      `Updated category "${category.name}"`,
      { 
        updatedFields: Object.keys(validatedData),
        color: category.color
      }
    );
    
    res.json(category);
  } catch (error) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Please check the form fields and try again',
        details: error.errors
      });
    }
    
    console.error('Update category error:', error);
    res.status(500).json({ 
      error: 'Failed to update category',
      message: error.message 
    });
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    // Find category and verify ownership
    const category = await Category.findOne({
      _id: req.params.id,
      owner: req.user.id
    });
    
    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
        message: 'Category not found or you do not have permission to delete it'
      });
    }
    
    // Check if category has tasks
    const taskCount = await Task.countDocuments({ category: category._id });
    
    if (taskCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete category',
        message: `Cannot delete category "${category.name}" because it has ${taskCount} task(s). Please reassign or delete the tasks first.`,
        taskCount
      });
    }
    
    // Log activity before deletion
    await logCategoryActivity(
      'category_deleted',
      req.user.id,
      category._id,
      `Deleted category "${category.name}"`,
      { color: category.color }
    );
    
    // Delete category
    await Category.findByIdAndDelete(req.params.id);
    
    res.json({
      message: 'Category deleted successfully',
      deletedCategory: {
        id: category._id,
        name: category.name
      }
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ 
      error: 'Failed to delete category',
      message: error.message 
    });
  }
});

// GET /api/categories/:id - Get single category
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).populate('taskCount');
    
    if (!category) {
      return res.status(404).json({
        error: 'Category not found',
        message: 'Category not found or you do not have permission to view it'
      });
    }
    
    res.json(category);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch category',
      message: error.message 
    });
  }
});

export default router;