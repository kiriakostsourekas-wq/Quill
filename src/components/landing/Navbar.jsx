import { useState } from 'react';
import { Menu, X, Feather } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navLinks = ['Features', 'How it works', 'Pricing', 'FAQ'];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2">
          <Feather className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-foreground tracking-tight">Quill</span>
        </a>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s/g, '-')}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {link}
            </a>
          ))}
        </div>

        <div className="hidden md:block">
          <Button asChild size="sm">
            <a href="#">Start free</a>
          </Button>
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background px-6 pb-4 pt-2 space-y-3">
          {navLinks.map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase().replace(/\s/g, '-')}`}
              className="block text-sm text-muted-foreground py-2"
              onClick={() => setOpen(false)}
            >
              {link}
            </a>
          ))}
          <Button asChild className="w-full" size="sm">
            <a href="#">Start free</a>
          </Button>
        </div>
      )}
    </nav>
  );
}