import express from 'express';
import { 
  getNGOAdminDashboard,
  getNGOManagerDashboard,
  getCitizenDashboard,
  getDonorDashboard,
  getVolunteerDashboard,
  getSuperAdminDashboard,
  enhancedDashboardController
} from '../controllers/dashboardController';
import { authenticate, authorize } from '../middleware/authMiddleware';

const router = express.Router();

// Enhanced Role-specific Dashboard Routes
router.get('/role-specific', authenticate, enhancedDashboardController.getRoleSpecificDashboard);
router.get('/admin/advanced', authenticate, authorize('ngo_admin', 'ngo'), enhancedDashboardController.getAdvancedNGOAdminDashboard);
router.get('/volunteer/advanced', authenticate, authorize('volunteer'), enhancedDashboardController.getAdvancedVolunteerDashboard);
router.get('/donor/advanced', authenticate, authorize('donor'), enhancedDashboardController.getAdvancedDonorDashboard);
router.get('/citizen/advanced', authenticate, authorize('citizen'), enhancedDashboardController.getAdvancedCitizenDashboard);
router.get('/kpi', authenticate, enhancedDashboardController.getKPIDashboard);
router.get('/real-time', authenticate, enhancedDashboardController.getRealTimeAnalytics);

// Advanced Dashboard API Routes
import { Request, Response } from 'express';

// Dashboard layout management
router.get('/layouts', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.query;
    
    // Mock layouts for different roles
    const layouts = [
      {
        id: 'admin-default',
        userId: 'admin',
        role: 'admin',
        name: 'Admin Dashboard',
        widgets: [
          {
            id: 'admin-kpi-1',
            type: 'kpi',
            title: 'Total Users',
            position: { x: 0, y: 0 },
            size: { width: 3, height: 2 },
            config: { dataSource: 'users-count', format: 'number' }
          },
          {
            id: 'admin-kpi-2',
            type: 'kpi',
            title: 'Total Donations',
            position: { x: 3, y: 0 },
            size: { width: 3, height: 2 },
            config: { dataSource: 'donations-total', format: 'currency' }
          },
          {
            id: 'admin-chart-1',
            type: 'chart',
            title: 'Monthly Growth',
            position: { x: 0, y: 2 },
            size: { width: 6, height: 4 },
            config: { dataSource: 'monthly-growth', chartType: 'line' }
          }
        ],
        isDefault: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'ngo-default',
        userId: 'ngo',
        role: 'ngo',
        name: 'NGO Dashboard',
        widgets: [
          {
            id: 'ngo-kpi-1',
            type: 'kpi',
            title: 'Active Programs',
            position: { x: 0, y: 0 },
            size: { width: 3, height: 2 },
            config: { dataSource: 'programs-count', format: 'number' }
          },
          {
            id: 'ngo-kpi-2',
            type: 'kpi',
            title: 'Total Volunteers',
            position: { x: 3, y: 0 },
            size: { width: 3, height: 2 },
            config: { dataSource: 'volunteers-count', format: 'number' }
          },
          {
            id: 'ngo-activity-1',
            type: 'activity',
            title: 'Recent Activity',
            position: { x: 0, y: 2 },
            size: { width: 6, height: 4 },
            config: { dataSource: 'recent-activity', maxItems: 10 }
          }
        ],
        isDefault: true,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const userLayouts = layouts.filter(layout => 
      layout.role === role || layout.isPublic
    );
    
    res.json(userLayouts);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

// Get specific layout
router.get('/layouts/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, role } = req.query;
    
    // Mock layout data - in production, fetch from database
    const layout = {
      id,
      userId: userId || 'user',
      role: role || 'citizen',
      name: 'Dashboard',
      widgets: [
        {
          id: 'widget-1',
          type: 'kpi',
          title: 'Sample KPI',
          position: { x: 0, y: 0 },
          size: { width: 3, height: 2 },
          config: { dataSource: 'sample-kpi', format: 'number' }
        }
      ],
      isDefault: true,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    res.json(layout);
  } catch (error) {
    console.error('Error fetching layout:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

// Widget data endpoint
router.post('/widgets/:id/data', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { config, filters, userId, role } = req.body;
    
    // Mock data based on data source
    const dataSource = config?.dataSource || id;
    const mockData: { [key: string]: any } = {
      'users-count': {
        value: 1250,
        label: 'Total Users',
        trend: { direction: 'up', percentage: 12.5, period: 'last month' }
      },
      'donations-total': {
        value: 45000,
        label: 'Total Donations',
        trend: { direction: 'up', percentage: 8.3, period: 'last month' }
      },
      'programs-count': {
        value: 23,
        label: 'Active Programs',
        trend: { direction: 'up', percentage: 4.2, period: 'last month' }
      },
      'volunteers-count': {
        value: 156,
        label: 'Total Volunteers',
        trend: { direction: 'up', percentage: 15.7, period: 'last month' }
      },
      'monthly-growth': {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Users',
            data: [120, 135, 180, 165, 200, 250],
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6'
          },
          {
            label: 'Donations',
            data: [20000, 25000, 30000, 28000, 35000, 40000],
            borderColor: '#10b981',
            backgroundColor: '#10b981'
          }
        ]
      },
      'recent-activity': [
        {
          id: '1',
          type: 'donation',
          title: 'New Donation',
          description: 'Received ₹5,000 from John Doe',
          timestamp: new Date(Date.now() - 1000 * 60 * 30),
          user: { id: '1', name: 'John Doe' }
        },
        {
          id: '2',
          type: 'volunteer',
          title: 'New Volunteer',
          description: 'Jane Smith applied for program',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
          user: { id: '2', name: 'Jane Smith' }
        }
      ]
    };
    
    const data = mockData[dataSource];
    
    if (!data) {
      res.status(404).json({ error: 'Data not found' });
      return;
    }
    
    res.json({ data });
  } catch (error) {
    console.error('Error fetching widget data:', error);
    res.status(500).json({ error: 'Failed to fetch widget data' });
  }
});

// Export dashboard
router.post('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const { layoutId, format, filters, userId, role } = req.body;
    
    // Mock export response
    res.json({ 
      message: 'Export generated successfully',
      downloadUrl: `/api/dashboard/download/${layoutId}-${Date.now()}.${format}`,
      exportedAt: new Date()
    });
  } catch (error) {
    console.error('Error exporting dashboard:', error);
    res.status(500).json({ error: 'Failed to export dashboard' });
  }
});

// Existing dashboard routes
router.get('/ngo-admin', authenticate, authorize('ngo_admin'), getNGOAdminDashboard);
router.get('/ngo-manager', authenticate, authorize('ngo_manager'), getNGOManagerDashboard);
router.get('/ngo-stats', authenticate, authorize('ngo'), getNGOAdminDashboard); // Generic NGO stats route
router.get('/citizen', authenticate, authorize('citizen'), getCitizenDashboard);
router.get('/donor', authenticate, authorize('donor'), getDonorDashboard);
router.get('/volunteer', authenticate, authorize('volunteer'), getVolunteerDashboard);
router.get('/super-admin', authenticate, authorize('ngo'), getSuperAdminDashboard);

export default router;
