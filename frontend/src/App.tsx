import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { EntityList } from './pages/EntityList';
import { EntityEditor } from './pages/EntityEditor';
import { MappingEditor } from './pages/MappingEditor';
import { ImprovedMappingEditor } from './pages/ImprovedMappingEditor';
import { ValueMappingEditor } from './pages/ValueMappingEditor';
import { CodeGenerator } from './pages/CodeGenerator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* <TestComponent /> */}
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/entities" element={<EntityList />} />
            <Route path="/entities/new" element={<EntityEditor />} />
            <Route path="/entities/:id" element={<EntityEditor />} />
            <Route path="/entities/:id/mappings" element={<ImprovedMappingEditor />} />
            <Route path="/entities/:id/legacy-mappings" element={<MappingEditor />} />
            <Route path="/entities/:id/value-mappings" element={<ValueMappingEditor />} />
            <Route path="/entities/:id/generate" element={<CodeGenerator />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" />
      </Router>
    </QueryClientProvider>
  );
}
