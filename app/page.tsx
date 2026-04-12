import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-8 p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">ExamDemo</h1>
          <p className="text-gray-500 text-lg">Digitale Prüfungsplattform</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/teacher">
            <Button size="lg" className="w-full sm:w-auto px-8">
              Prüfung erstellen
            </Button>
          </Link>
          <Link href="/student">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
              Prüfung ablegen
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
