const TaskLabel = require('../models/TaskLabel');
const Task = require('../models/Task');

const DEFAULT_LABELS = [
  'QUOTE',
  'Design',
  'site visit',
  'Installation',
  'Invoice',
  'Procurement',
  'meeting',
  'service',
  'Delivery',
  'ADMIN',
  'OPERATIONS',
  'CONCEPT DESIGN',
  'MEP DESIGN',
  'AMC',
  'CO-ORDINATION',
];

const ensureDefaultLabels = async () => {
  const count = await TaskLabel.countDocuments();
  if (count > 0) return;

  await TaskLabel.insertMany(
    DEFAULT_LABELS.map((name) => ({ name })),
    { ordered: false }
  ).catch(() => {});
};

exports.getTaskLabels = async (req, res) => {
  try {
    await ensureDefaultLabels();
    const labels = await TaskLabel.find().sort({ name: 1 });
    res.json({ success: true, labels });
  } catch (error) {
    console.error('Get task labels error:', error);
    res.status(500).json({ message: 'Failed to fetch task labels' });
  }
};

exports.createTaskLabel = async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Label name is required' });
    }

    const existing = await TaskLabel.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
    });
    if (existing) {
      return res.status(400).json({ message: 'A label with this name already exists' });
    }

    const label = await TaskLabel.create({
      name,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, label });
  } catch (error) {
    console.error('Create task label error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A label with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create task label' });
  }
};

exports.deleteTaskLabel = async (req, res) => {
  try {
    const label = await TaskLabel.findById(req.params.id);
    if (!label) {
      return res.status(404).json({ message: 'Label not found' });
    }

    const inUseCount = await Task.countDocuments({ label: label.name });
    await TaskLabel.findByIdAndDelete(label._id);

    res.json({
      success: true,
      message: inUseCount > 0
        ? `Label deleted. ${inUseCount} existing task(s) still keep this label value.`
        : 'Label deleted successfully'
    });
  } catch (error) {
    console.error('Delete task label error:', error);
    res.status(500).json({ message: 'Failed to delete task label' });
  }
};
