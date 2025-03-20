import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wand2, History, Home, Info, Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/layout/ModeToggle';
import { cn } from '@/lib/utils';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/', icon: <Home className="h-4 w-4 mr-1" /> },
    { name: 'Editor', path: '/editor', icon: <Wand2 className="h-4 w-4 mr-1" /> },
    { name: 'History', path: '/history', icon: <History className="h-4 w-4 mr-1" /> },
    { name: 'About', path: '/about', icon: <Info className="h-4 w-4 mr-1" /> },
  ];

  const logoVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05, transition: { duration: 0.2 } }
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200',
        isScrolled
          ? 'bg-background/80 backdrop-blur-md shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.div
            variants={logoVariants}
            initial="initial"
            whileHover="hover"
          >
            <Link to="/" className="flex items-center space-x-2">
              <Wand2 className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Tewen</span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Button
                key={link.path}
                variant={location.pathname === link.path ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link to={link.path} className="flex items-center">
                  {link.icon}
                  {link.name}
                </Link>
              </Button>
            ))}
          </nav>

          <div className="flex items-center space-x-2">
            <ModeToggle />
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
            
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="md:hidden bg-background/95 backdrop-blur-md border-b"
        >
          <nav className="container mx-auto px-4 py-3 flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Button
                key={link.path}
                variant={location.pathname === link.path ? "default" : "ghost"}
                size="sm"
                asChild
                className="justify-start"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Link to={link.path} className="flex items-center">
                  {link.icon}
                  {link.name}
                </Link>
              </Button>
            ))}
          </nav>
        </motion.div>
      )}
    </header>
  );
};

export default Navbar;