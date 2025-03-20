import { motion } from 'framer-motion'
import { ArrowRight, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function Home() {
  // Project
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  }

  return (
    <div className='container mx-auto px-4 pt-24 pb-16'>
      <motion.div
        className='flex flex-col items-center text-center max-w-3xl mx-auto mt-16 mb-16'
        variants={container}
        initial='hidden'
        animate='show'
      >
        <motion.div variants={item} className='mb-4'>
          <div className='inline-block p-2 bg-primary/10 rounded-full mb-4'>
            <Wand2 className='h-8 w-8 text-primary' />
          </div>
        </motion.div>
        <motion.h1
          variants={item}
          className='text-4xl md:text-6xl font-bold tracking-tight mb-6'
        >
          Create beautiful websites with{' '}
          <span className='bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent'>
            AI
          </span>
        </motion.h1>
        <motion.p
          variants={item}
          className='text-xl text-muted-foreground mb-8 max-w-2xl'
        >
          Tewen transforms your ideas into stunning websites in seconds. Just
          describe what you want, and our AI will generate a custom website for
          you.
        </motion.p>
        <motion.div variants={item}>
          <Button asChild size='lg' className='rounded-full'>
            <Link to='/editor' className='flex items-center gap-2'>
              Start Creating <ArrowRight className='h-4 w-4' />
            </Link>
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className='relative mx-auto max-w-5xl rounded-lg border shadow-xl overflow-hidden'
      >
        <img
          src='https://images.unsplash.com/photo-1597534458220-9fb4969f2df5?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
          alt='Tewen AI Website Generator'
          className='w-full h-auto'
        />
      </motion.div>
    </div>
  )
}
