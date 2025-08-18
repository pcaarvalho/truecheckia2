import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Menu, 
  User, 
  History, 
  UserCircle,
  Settings,
  LogOut,
  ChevronDown,
  BarChart3
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { CreditTracker } from "@/components/credits/CreditTracker";
import { subscriptionService } from "@/services/subscription.service";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();

  // Public navigation items
  const publicNavItems = [
    { name: "Features", href: "#features" },
    { name: "Pricing", href: "#pricing" },
    { name: "API", href: "#api" },
    { name: "Blog", href: "#blog" },
  ];

  // Authenticated user navigation items
  const authNavItems = [
    { 
      name: "Dashboard", 
      href: "/dashboard", 
      icon: BarChart3,
      onClick: () => navigate('/dashboard')
    },
    { 
      name: "New Analysis", 
      href: "/analysis", 
      icon: Sparkles,
      onClick: () => navigate('/analysis'),
      variant: "hero" as const
    },
    { 
      name: "History", 
      href: "/history", 
      icon: History,
      onClick: () => navigate('/history')
    },
  ];

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isPro = user?.plan === 'pro' || user?.plan === 'premium';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Sparkles className="h-8 w-8 text-primary animate-pulse" />
            <div className="absolute inset-0 h-8 w-8 text-primary animate-pulse-glow" />
          </div>
          <span className="text-xl font-bold gradient-text">TrueCheckIA</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          {isAuthenticated ? (
            // Authenticated user navigation
            <>
              {authNavItems.map((item) => {
                const isActive = isActiveRoute(item.href);
                const Icon = item.icon;
                
                if (item.variant === "hero") {
                  return (
                    <Button
                      key={item.name}
                      variant="hero"
                      size="sm"
                      onClick={item.onClick}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Button>
                  );
                }
                
                return (
                  <button
                    key={item.name}
                    onClick={item.onClick}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200",
                      isActive 
                        ? "text-primary bg-primary/10" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </button>
                );
              })}
            </>
          ) : (
            // Public navigation
            <>
              {publicNavItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium"
                >
                  {item.name}
                </a>
              ))}
            </>
          )}
        </nav>

        {/* Desktop CTA Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <CreditTracker className="mr-2" />
              
              {/* User Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex items-center gap-2 px-3"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        isPro 
                          ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                      </div>
                      <span className="text-sm font-medium">
                        {user?.name || user?.email?.split('@')[0]}
                      </span>
                      {isPro && (
                        <span className="text-xs bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                          PRO
                        </span>
                      )}
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                      {isPro && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                            PRO PLAN
                          </span>
                        </div>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => navigate('/profile')}
                    className="cursor-pointer"
                  >
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate('/profile')}
                    className="cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="cursor-pointer text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
              <Button 
                variant="hero" 
                size="sm"
                onClick={() => navigate('/register')}
              >
                Get Started Free
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="glass border-l border-border/50">
            <div className="flex flex-col space-y-6 mt-8">
              {isAuthenticated ? (
                <>
                  {/* User Info Section */}
                  <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                      isPro 
                        ? "bg-gradient-to-r from-purple-500 to-indigo-500 text-white" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {user?.name || user?.email?.split('@')[0]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {user?.email}
                      </p>
                      {isPro && (
                        <span className="text-xs bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-1.5 py-0.5 rounded-full font-medium">
                          PRO
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Credits */}
                  <div className="mb-2">
                    <CreditTracker />
                  </div>
                  
                  {/* Navigation Items */}
                  {authNavItems.map((item) => {
                    const isActive = isActiveRoute(item.href);
                    const Icon = item.icon;
                    
                    return (
                      <Button
                        key={item.name}
                        variant={item.variant || (isActive ? "secondary" : "ghost")}
                        onClick={() => {
                          setIsOpen(false);
                          item.onClick();
                        }}
                        className={cn(
                          "justify-start w-full",
                          isActive && !item.variant && "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="mr-2 h-4 w-4" />
                        {item.name}
                      </Button>
                    );
                  })}
                  
                  {/* User Actions */}
                  <div className="flex flex-col space-y-2 pt-4 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/profile');
                      }}
                      className="justify-start w-full"
                    >
                      <UserCircle className="mr-2 h-4 w-4" />
                      Profile
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/profile');
                      }}
                      className="justify-start w-full"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Button>
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setIsOpen(false);
                        handleLogout();
                      }}
                      className="justify-start w-full text-red-600 hover:text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Public Navigation */}
                  {publicNavItems.map((item) => (
                    <a
                      key={item.name}
                      href={item.href}
                      className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </a>
                  ))}
                  
                  {/* Auth Buttons */}
                  <div className="flex flex-col space-y-3 pt-4 border-t border-border/50">
                    <Button 
                      variant="ghost" 
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/login');
                      }}
                    >
                      Login
                    </Button>
                    <Button 
                      variant="hero" 
                      onClick={() => {
                        setIsOpen(false);
                        navigate('/register');
                      }}
                    >
                      Get Started Free
                    </Button>
                  </div>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};

export default Header;