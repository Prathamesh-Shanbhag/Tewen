import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const Layout = () => {
  const location = useLocation();
  const isEditorPage = location.pathname === '/editor';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <motion.main 
        className="flex-1"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Outlet />
      </motion.main>
      {!isEditorPage && <Footer />}
    </div>
  );
};

export default Layout;