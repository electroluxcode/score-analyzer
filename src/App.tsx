import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './context/DataContext';
import { Layout } from './components/Layout';
import { DataManagement } from './pages/DataManagement';
import { OverviewAnalysis } from './pages/OverviewAnalysis';
import { ClassAnalysis } from './pages/ClassAnalysis';
import { PersonalAnalysis } from './pages/PersonalAnalysis';
import { StudentRanking } from './pages/StudentRanking';

function App() {
  return (
    <DataProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/data" replace />} />
            <Route path="data" element={<DataManagement />} />
            <Route path="overview" element={<OverviewAnalysis />} />
            <Route path="class" element={<ClassAnalysis />} />
            <Route path="personal" element={<PersonalAnalysis />} />
            <Route path="ranking" element={<StudentRanking />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  );
}

export default App;
