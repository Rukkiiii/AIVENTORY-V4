import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { LineChart, BarChart } from 'react-native-chart-kit';

const windowWidth = Dimensions.get('window').width;

// Sample data for different tabs
const DAILY_SALES_DATA = [
  { date: 'May 7', units: 9, revenue: 22.50, invoices: ['INV-0520', 'INV-0522'] },
  { date: 'May 8', units: 6, revenue: 15.00, invoices: ['INV-0527'] },
  { date: 'May 9', units: 12, revenue: 30.00, invoices: ['INV-0533', 'INV-0536'] },
  { date: 'May 10', units: 7, revenue: 17.50, invoices: ['INV-0539'] },
  { date: 'May 11', units: 10, revenue: 25.00, invoices: ['INV-0542', 'INV-0548'] },
  { date: 'May 12', units: 8, revenue: 20.00, invoices: ['INV-0555', 'INV-0557'] },
  { date: 'May 13', units: 5, revenue: 12.50, invoices: ['INV-0562'] },
];

const MONTHLY_DATA = [
  { month: 'Dec 2024', units: 85, revenue: 212.50, avgDaily: 2.7, trend: 'up' },
  { month: 'Jan 2025', units: 55, revenue: 137.50, avgDaily: 1.8, trend: 'down' },
  { month: 'Feb 2025', units: 60, revenue: 150.00, avgDaily: 2.1, trend: 'down' },
  { month: 'Mar 2025', units: 70, revenue: 175.00, avgDaily: 2.3, trend: 'up' },
  { month: 'Apr 2025', units: 75, revenue: 187.50, avgDaily: 5.0, trend: 'up' },
  { month: 'May 2025', units: 57, revenue: 142.50, avgDaily: 8.1, trend: 'up' },
];

const YEARLY_DATA = [
  { year: '2021', units: 770, revenue: 1925.00, avgMonthly: 64.2, yoyGrowth: 'up' },
  { year: '2022', units: 863, revenue: 2157.50, avgMonthly: 71.9, yoyGrowth: 'up' },
  { year: '2023', units: 837, revenue: 2092.50, avgMonthly: 69.8, yoyGrowth: 'down' },
  { year: '2024', units: 879, revenue: 2197.50, avgMonthly: 73.3, yoyGrowth: 'up' },
  { year: '2025', units: 347, revenue: 867.50, avgMonthly: 69.4, yoyGrowth: 'up' },
];

const INVOICE_HISTORY = [
  { id: 'INV-0562', date: 'May 13, 2025', customer: 'MotoMax Performance', units: 5, total: 12.50, status: 'Paid' },
  { id: 'INV-0557', date: 'May 12, 2025', customer: 'Speed Demons Garage', units: 3, total: 7.50, status: 'Paid' },
  { id: 'INV-0555', date: 'May 12, 2025', customer: 'RiderZone Supply Co.', units: 5, total: 12.50, status: 'Paid' },
  { id: 'INV-0548', date: 'May 11, 2025', customer: 'Two Wheels Service Center', units: 6, total: 15.00, status: 'Paid' },
  { id: 'INV-0542', date: 'May 11, 2025', customer: 'MotorHeads Repair Shop', units: 4, total: 10.00, status: 'Paid' },
  { id: 'INV-0539', date: 'May 10, 2025', customer: 'Cycle City Parts', units: 7, total: 17.50, status: 'Paid' },
  { id: 'INV-0536', date: 'May 9, 2025', customer: 'Throttle Up Customs', units: 8, total: 20.00, status: 'Paid' },
  { id: 'INV-0533', date: 'May 9, 2025', customer: 'Biker\'s Paradise', units: 4, total: 10.00, status: 'Paid' },
];

export default function AnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [activeTab, setActiveTab] = useState('daily');

  // Get item data from params or use default
  const item = {
    name: params.name || 'AA Batteries',
    sku: params.sku || 'BAT-AA-001',
    stock: params.stock || 45,
    threshold: params.threshold || 50,
    status: params.status || 'At Risk'
  };

  // Calculate days until empty (simplified)
  const daysUntilEmpty = 7; // Based on web version
  const usageThisMonth = 75;
  const usageThisYear = 625;

  // Chart data
  const dailyChartData = {
    labels: DAILY_SALES_DATA.map(item => item.date),
    datasets: [
      {
        data: DAILY_SALES_DATA.map(item => item.units),
        color: (opacity = 1) => `rgba(46, 58, 140, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ['Units Sold']
  };

  const monthlyChartData = {
    labels: MONTHLY_DATA.map(item => item.month),
    datasets: [
      {
        data: MONTHLY_DATA.map(item => item.units),
        color: (opacity = 1) => `rgba(46, 58, 140, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ['Monthly Sales']
  };

  const yearlyChartData = {
    labels: YEARLY_DATA.map(item => item.year),
    datasets: [
      {
        data: YEARLY_DATA.map(item => item.units),
        color: (opacity = 1) => `rgba(46, 58, 140, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ['Yearly Sales']
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 58, 140, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(51, 51, 51, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#2E3A8C'
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/prediction')} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#2E3A8C" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.title}>Detailed Analysis</ThemedText>
      </View>

      {/* Item Details */}
      <Card style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <ThemedText type="defaultSemiBold" style={styles.itemName}>{item.name}</ThemedText>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
        <View style={styles.itemMeta}>
          <View style={styles.metaItem}>
            <ThemedText style={styles.metaLabel}>SKU:</ThemedText>
            <ThemedText style={styles.metaValue}>{item.sku}</ThemedText>
          </View>
        </View>
      </Card>

      {/* Summary Stats */}
      <Card style={styles.summaryCard}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>Analysis Summary</ThemedText>
        <View style={styles.summaryStats}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{item.stock}</ThemedText>
            <ThemedText style={styles.statLabel}>Current Stock</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, styles.danger]}>{daysUntilEmpty}</ThemedText>
            <ThemedText style={styles.statLabel}>Days Until Empty</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{usageThisMonth}</ThemedText>
            <ThemedText style={styles.statLabel}>Usage This Month</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{usageThisYear}</ThemedText>
            <ThemedText style={styles.statLabel}>Usage This Year</ThemedText>
          </View>
        </View>
      </Card>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          <View style={styles.tabButtons}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'daily' && styles.activeTab]} 
              onPress={() => setActiveTab('daily')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>Daily Sales</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'monthly' && styles.activeTab]} 
              onPress={() => setActiveTab('monthly')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>Monthly Analysis</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'yearly' && styles.activeTab]} 
              onPress={() => setActiveTab('yearly')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'yearly' && styles.activeTabText]}>Yearly Analysis</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'invoices' && styles.activeTab]} 
              onPress={() => setActiveTab('invoices')}
            >
              <ThemedText style={[styles.tabText, activeTab === 'invoices' && styles.activeTabText]}>Invoice History</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.contentContainer}>
        {activeTab === 'daily' && (
          <View style={styles.tabContent}>
            <ThemedText type="subtitle" style={styles.contentTitle}>Daily Sales Breakdown</ThemedText>
            <Card style={styles.chartCard}>
              <LineChart
                data={dailyChartData}
                width={windowWidth - 64}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </Card>
            <Card style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Date</Text>
                <Text style={styles.tableHeaderText}>Units</Text>
                <Text style={styles.tableHeaderText}>Revenue</Text>
                <Text style={styles.tableHeaderText}>Invoices</Text>
              </View>
              {DAILY_SALES_DATA.map((dataItem) => (
                <View key={`daily-${dataItem.date}`} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{dataItem.date}</Text>
                  <Text style={styles.tableCell}>{dataItem.units}</Text>
                  <Text style={styles.tableCell}>${dataItem.revenue.toFixed(2)}</Text>
                  <Text style={styles.tableCell}>{dataItem.invoices.join(', ')}</Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {activeTab === 'monthly' && (
          <View style={styles.tabContent}>
            <ThemedText type="subtitle" style={styles.contentTitle}>Monthly Sales Trends</ThemedText>
            <Card style={styles.chartCard}>
              <LineChart
                data={monthlyChartData}
                width={windowWidth - 64}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
              />
            </Card>
            <Card style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Month</Text>
                <Text style={styles.tableHeaderText}>Units</Text>
                <Text style={styles.tableHeaderText}>Revenue</Text>
                <Text style={styles.tableHeaderText}>Avg Daily</Text>
                <Text style={styles.tableHeaderText}>Trend</Text>
              </View>
              {MONTHLY_DATA.map((dataItem) => (
                <View key={`monthly-${dataItem.month}`} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{dataItem.month}</Text>
                  <Text style={styles.tableCell}>{dataItem.units}</Text>
                  <Text style={styles.tableCell}>${dataItem.revenue.toFixed(2)}</Text>
                  <Text style={styles.tableCell}>{dataItem.avgDaily}</Text>
                  <Text style={[styles.tableCell, dataItem.trend === 'up' ? styles.trendUp : styles.trendDown]}>
                    {dataItem.trend === 'up' ? '↑' : '↓'}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {activeTab === 'yearly' && (
          <View style={styles.tabContent}>
            <ThemedText type="subtitle" style={styles.contentTitle}>Yearly Sales Performance</ThemedText>
            <Card style={styles.chartCard}>
              <BarChart
                data={yearlyChartData}
                width={windowWidth - 64}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                yAxisSuffix=""
                showValuesOnTopOfBars
              />
            </Card>
            <Card style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Year</Text>
                <Text style={styles.tableHeaderText}>Units</Text>
                <Text style={styles.tableHeaderText}>Revenue</Text>
                <Text style={styles.tableHeaderText}>Avg Monthly</Text>
                <Text style={styles.tableHeaderText}>YoY Growth</Text>
              </View>
              {YEARLY_DATA.map((dataItem) => (
                <View key={`yearly-${dataItem.year}`} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{dataItem.year}</Text>
                  <Text style={styles.tableCell}>{dataItem.units}</Text>
                  <Text style={styles.tableCell}>${dataItem.revenue.toFixed(2)}</Text>
                  <Text style={styles.tableCell}>{dataItem.avgMonthly}</Text>
                  <Text style={[styles.tableCell, dataItem.yoyGrowth === 'up' ? styles.trendUp : styles.trendDown]}>
                    {dataItem.yoyGrowth === 'up' ? '↑' : '↓'}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {activeTab === 'invoices' && (
          <View style={styles.tabContent}>
            <ThemedText type="subtitle" style={styles.contentTitle}>Complete Invoice History</ThemedText>
            <Card style={styles.tableCard}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Invoice ID</Text>
                <Text style={styles.tableHeaderText}>Date</Text>
                <Text style={styles.tableHeaderText}>Customer</Text>
                <Text style={styles.tableHeaderText}>Units</Text>
                <Text style={styles.tableHeaderText}>Total</Text>
                <Text style={styles.tableHeaderText}>Status</Text>
              </View>
              {INVOICE_HISTORY.map((dataItem) => (
                <View key={`inv-${dataItem.id}`} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{dataItem.id}</Text>
                  <Text style={styles.tableCell}>{dataItem.date}</Text>
                  <Text style={styles.tableCell}>{dataItem.customer}</Text>
                  <Text style={styles.tableCell}>{dataItem.units}</Text>
                  <Text style={styles.tableCell}>${dataItem.total.toFixed(2)}</Text>
                  <View style={styles.statusCell}>
                    <View style={styles.paidBadge}>
                      <Text style={styles.paidText}>{dataItem.status}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

// Helper function to get status style
function getStatusStyle(status: string) {
  switch (status) {
    case 'Good': return { backgroundColor: 'rgba(6, 214, 160, 0.1)', borderColor: '#06D6A0' };
    case 'Warning': return { backgroundColor: 'rgba(255, 209, 102, 0.1)', borderColor: '#FFD166' };
    case 'At Risk': return { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: '#FF6B6B' };
    default: return { backgroundColor: 'rgba(108, 117, 125, 0.1)', borderColor: '#6C757D' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  title: {
    flex: 1,
    color: '#1a1a1a',
  },
  itemCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemName: {
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    marginRight: 16,
  },
  metaLabel: {
    color: '#666666',
    marginRight: 4,
  },
  metaValue: {
    color: '#333333',
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 16,
    color: '#1a1a1a',
  },
  summaryStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    width: '50%',
    marginBottom: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    color: '#666666',
    marginTop: 4,
  },
  danger: {
    color: '#FF6B6B',
  },
  tabContainer: {
    marginVertical: 16,
  },
  tabScroll: {
    paddingHorizontal: 16,
  },
  tabButtons: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    padding: 4,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#2E3A8C',
  },
  tabText: {
    color: '#666666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabContent: {
    paddingBottom: 16,
  },
  contentTitle: {
    marginBottom: 16,
    color: '#1a1a1a',
  },
  chartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chart: {
    borderRadius: 16,
  },
  tableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontWeight: '600',
    color: '#333333',
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableCell: {
    flex: 1,
    color: '#333333',
    fontSize: 14,
  },
  statusCell: {
    flex: 1,
    justifyContent: 'center',
  },
  paidBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 214, 160, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paidText: {
    color: '#06D6A0',
    fontSize: 12,
    fontWeight: '600',
  },
  trendUp: {
    color: '#06D6A0',
    fontWeight: '700',
  },
  trendDown: {
    color: '#FF6B6B',
    fontWeight: '700',
  },
});