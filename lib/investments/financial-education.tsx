import React from "react"
import { 
  BookOpen, 
  DollarSign, 
  PiggyBank, 
  TrendingUp, 
  CreditCard, 
  Home, 
  Briefcase, 
  GraduationCap,
  Shield,
  Landmark
} from "lucide-react"
import { FinancialEducationChannel, FinancialTopic } from "./types"

// Financial education YouTube channels
export const financialEducationChannels: FinancialEducationChannel[] = [
  {
    id: "financial-diet",
    name: "The Financial Diet",
    url: "https://www.youtube.com/c/TheFinancialDiet",
    description: "Personal finance, career advice, and lifestyle tips for millennials and Gen Z.",
    thumbnail: "https://i.ytimg.com/vi/sH_9J9BVVas/maxresdefault.jpg",
    topics: ["Budgeting", "Career Development", "Money Mindset", "Debt Management"],
    difficulty: "Beginner",
    featured: true,
    featuredVideo: "https://www.youtube.com/watch?v=sH_9J9BVVas",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLzOQn4JyXz72YY0E0CfHQVE5GYtJsD60V"
  },
  {
    id: "graham-stephan",
    name: "Graham Stephan",
    url: "https://www.youtube.com/c/GrahamStephan",
    description: "Real estate investing, wealth building, and financial independence strategies.",
    thumbnail: "https://i.ytimg.com/vi/mS9CURzLgVs/maxresdefault.jpg",
    topics: ["Real Estate", "Investing", "Financial Independence", "Credit Cards"],
    difficulty: "Intermediate",
    featured: true,
    featuredVideo: "https://www.youtube.com/watch?v=mS9CURzLgVs",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLWALQuE0wehvYbplEk4RXi3-c8Tn_rOuA"
  },
  {
    id: "whiteboard-finance",
    name: "WhiteBoard Finance",
    url: "https://www.youtube.com/c/WhiteBoardFinance",
    description: "Visual explanations of complex financial concepts and investment strategies.",
    thumbnail: "https://i.ytimg.com/vi/kkG7ifK6j_Q/maxresdefault.jpg",
    topics: ["Investing", "Retirement Planning", "Tax Strategies", "Stock Market"],
    difficulty: "Intermediate",
    featured: true,
    featuredVideo: "https://www.youtube.com/watch?v=kkG7ifK6j_Q",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
  },
  {
    id: "mapped-out-money",
    name: "MappedOutMoney",
    url: "https://www.youtube.com/c/MappedOutMoney",
    description: "Financial planning, budgeting, and debt payoff strategies for everyday people.",
    thumbnail: "https://i.ytimg.com/vi/UPiJlK0l5ac/maxresdefault.jpg",
    topics: ["Budgeting", "Debt Payoff", "Financial Planning", "Money Management"],
    difficulty: "Beginner",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=UPiJlK0l5ac"
  },
  {
    id: "your-money-your-wealth",
    name: "Your Money, Your Wealth",
    url: "https://www.youtube.com/c/YourMoneyYourWealth",
    description: "Retirement planning, tax strategies, and wealth management advice from financial professionals.",
    thumbnail: "https://i.ytimg.com/vi/Jcn_4uVtUGw/maxresdefault.jpg",
    topics: ["Retirement", "Tax Planning", "Estate Planning", "Wealth Management"],
    difficulty: "Advanced",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=Jcn_4uVtUGw",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
  },
  {
    id: "ask-sebby",
    name: "Ask Sebby",
    url: "https://www.youtube.com/c/AskSebby",
    description: "Credit card optimization, travel rewards, and credit score improvement strategies.",
    thumbnail: "https://i.ytimg.com/vi/6Kb_M_Au2Vg/maxresdefault.jpg",
    topics: ["Credit Cards", "Travel Rewards", "Credit Scores", "Points Optimization"],
    difficulty: "Intermediate",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=6Kb_M_Au2Vg",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
  },
  {
    id: "trufinancials",
    name: "TruFinancials",
    url: "https://www.youtube.com/c/TruFinancials",
    description: "Personal finance advice, credit building, and debt elimination strategies.",
    thumbnail: "https://i.ytimg.com/vi/0nhXPXYLQQs/maxresdefault.jpg",
    topics: ["Credit Building", "Debt Elimination", "Saving", "Frugal Living"],
    difficulty: "Beginner",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=0nhXPXYLQQs"
  },
  {
    id: "millennial-on-fire",
    name: "Millennial on Fire",
    url: "https://www.youtube.com/c/MillennialonFire",
    description: "Financial independence and early retirement strategies for millennials.",
    thumbnail: "https://i.ytimg.com/vi/xbSH3BFYwrM/maxresdefault.jpg",
    topics: ["FIRE Movement", "Investing", "Side Hustles", "Financial Independence"],
    difficulty: "Intermediate",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=xbSH3BFYwrM",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
  },
  {
    id: "beat-the-bush",
    name: "BeatTheBush",
    url: "https://www.youtube.com/c/BeatTheBush",
    description: "Frugal living tips, investment strategies, and financial optimization techniques.",
    thumbnail: "https://i.ytimg.com/vi/PHe0bXAIuk0/maxresdefault.jpg",
    topics: ["Frugality", "Investing", "Tax Optimization", "Early Retirement"],
    difficulty: "Intermediate",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=PHe0bXAIuk0"
  },
  {
    id: "debt-free-millennials",
    name: "Debt Free Millennials",
    url: "https://www.youtube.com/c/DebtFreeMillennials",
    description: "Debt elimination strategies and financial freedom advice for millennials.",
    thumbnail: "https://i.ytimg.com/vi/M3-iu_Jz8vo/maxresdefault.jpg",
    topics: ["Debt Elimination", "Financial Freedom", "Millennial Finance", "Budgeting"],
    difficulty: "Beginner",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=M3-iu_Jz8vo",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
  },
  {
    id: "next-gen-personal-finance",
    name: "Next Gen Personal Finance",
    url: "https://www.youtube.com/c/NextGenPersonalFinance",
    description: "Financial education resources for students and young adults.",
    thumbnail: "https://i.ytimg.com/vi/sVKQn2I4HDM/maxresdefault.jpg",
    topics: ["Financial Literacy", "Student Finance", "Investing Basics", "Budgeting"],
    difficulty: "Beginner",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=sVKQn2I4HDM",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLfpVYDrEXZTKDGQgK8mBGb0Rk3JyErVrK"
  },
  {
    id: "andrei-jikh",
    name: "Andrei Jikh",
    url: "https://www.youtube.com/c/AndreiJikh",
    description: "Cryptocurrency, stock market investing, and passive income strategies.",
    thumbnail: "https://i.ytimg.com/vi/Vb3IZ7GTlhI/maxresdefault.jpg",
    topics: ["Cryptocurrency", "Stock Market", "Passive Income", "Financial Minimalism"],
    difficulty: "Intermediate",
    featured: true,
    featuredVideo: "https://www.youtube.com/watch?v=Vb3IZ7GTlhI",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
  },
  {
    id: "money-talks-news",
    name: "Money Talks News",
    url: "https://www.youtube.com/c/MoneyTalksNews",
    description: "Financial news, consumer advice, and money-saving tips.",
    thumbnail: "https://i.ytimg.com/vi/M5y69v1RbU0/maxresdefault.jpg",
    topics: ["Consumer Advice", "Money Saving", "Retirement", "Financial News"],
    difficulty: "Beginner",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=1QWw3HBZRBs",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
  },
  {
    id: "khan-academy-finance",
    name: "Khan Academy - Personal Finance",
    url: "https://www.youtube.com/c/khanacademy",
    description: "Educational videos covering personal finance fundamentals and concepts.",
    thumbnail: "https://i.ytimg.com/vi/sVKQn2I4HDM/maxresdefault.jpg",
    topics: ["Financial Literacy", "Investing Basics", "Taxes", "Banking"],
    difficulty: "Beginner",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=sVKQn2I4HDM",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLSQl0a2vh4HC9lvrBhVt0UkuKsUAJDLdS"
  },
  {
    id: "jack-corsellis",
    name: "Jack Corsellis",
    url: "https://www.youtube.com/c/JackCorsellis",
    description: "Financial independence, investing, and money management for young adults.",
    thumbnail: "https://i.ytimg.com/vi/M5y69v1RbU0/maxresdefault.jpg",
    topics: ["Investing", "Financial Independence", "Money Management", "Side Hustles"],
    difficulty: "Intermediate",
    featured: false,
    featuredVideo: "https://www.youtube.com/watch?v=M5y69v1RbU0",
    featuredPlaylist: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
  }
]

// Financial education topics
export const financialTopics: FinancialTopic[] = [
  {
    id: "budgeting-basics",
    title: "Budgeting Basics",
    description: "Learn how to create and maintain a budget that works for your lifestyle and financial goals.",
    difficulty: "Beginner",
    keywords: ["budget", "spending plan", "50/30/20 rule", "zero-based budget", "cash flow"],
    recommendedChannels: [
      {
        name: "The Financial Diet",
        url: "https://www.youtube.com/c/TheFinancialDiet",
        playlistUrl: "https://www.youtube.com/playlist?list=PLzOQn4JyXz72YY0E0CfHQVE5GYtJsD60V"
      },
      {
        name: "MappedOutMoney",
        url: "https://www.youtube.com/c/MappedOutMoney",
        videoUrl: "https://www.youtube.com/watch?v=UPiJlK0l5ac"
      },
      {
        name: "Debt Free Millennials",
        url: "https://www.youtube.com/c/DebtFreeMillennials",
        videoUrl: "https://www.youtube.com/watch?v=M3-iu_Jz8vo"
      },
      {
        name: "Next Gen Personal Finance",
        url: "https://www.youtube.com/c/NextGenPersonalFinance",
        playlistUrl: "https://www.youtube.com/playlist?list=PLfpVYDrEXZTKDGQgK8mBGb0Rk3JyErVrK"
      }
    ],
    icon: <PiggyBank className="h-5 w-5 text-white" />,
    colorClass: "bg-green-500"
  },
  {
    id: "investing-101",
    title: "Investing 101",
    description: "Understand the fundamentals of investing, from stocks and bonds to index funds and ETFs.",
    difficulty: "Beginner",
    keywords: ["stocks", "bonds", "index funds", "ETFs", "compound interest", "diversification"],
    recommendedChannels: [
      {
        name: "WhiteBoard Finance",
        url: "https://www.youtube.com/c/WhiteBoardFinance",
        videoUrl: "https://www.youtube.com/watch?v=kkG7ifK6j_Q"
      },
      {
        name: "Graham Stephan",
        url: "https://www.youtube.com/c/GrahamStephan",
        playlistUrl: "https://www.youtube.com/playlist?list=PLWALQuE0wehvYbplEk4RXi3-c8Tn_rOuA"
      },
      {
        name: "Khan Academy - Personal Finance",
        url: "https://www.youtube.com/c/khanacademy",
        playlistUrl: "https://www.youtube.com/playlist?list=PLSQl0a2vh4HC9lvrBhVt0UkuKsUAJDLdS"
      },
      {
        name: "Andrei Jikh",
        url: "https://www.youtube.com/c/AndreiJikh",
        videoUrl: "https://www.youtube.com/watch?v=Vb3IZ7GTlhI"
      }
    ],
    icon: <TrendingUp className="h-5 w-5 text-white" />,
    colorClass: "bg-blue-500"
  },
  {
    id: "debt-elimination",
    title: "Debt Elimination Strategies",
    description: "Effective strategies for paying off debt and staying debt-free for good.",
    difficulty: "Beginner",
    keywords: ["debt snowball", "debt avalanche", "loan consolidation", "interest rates", "credit card debt"],
    recommendedChannels: [
      {
        name: "Debt Free Millennials",
        url: "https://www.youtube.com/c/DebtFreeMillennials",
        playlistUrl: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
      },
      {
        name: "TruFinancials",
        url: "https://www.youtube.com/c/TruFinancials",
        videoUrl: "https://www.youtube.com/watch?v=0nhXPXYLQQs"
      },
      {
        name: "The Financial Diet",
        url: "https://www.youtube.com/c/TheFinancialDiet",
        videoUrl: "https://www.youtube.com/watch?v=sH_9J9BVVas"
      },
      {
        name: "MappedOutMoney",
        url: "https://www.youtube.com/c/MappedOutMoney",
        playlistUrl: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
      }
    ],
    icon: <CreditCard className="h-5 w-5 text-white" />,
    colorClass: "bg-red-500"
  },
  {
    id: "retirement-planning",
    title: "Retirement Planning",
    description: "How to plan and save for retirement, including account types, contribution strategies, and withdrawal plans.",
    difficulty: "Intermediate",
    keywords: ["401(k)", "IRA", "Roth", "retirement accounts", "social security", "pension"],
    recommendedChannels: [
      {
        name: "Your Money, Your Wealth",
        url: "https://www.youtube.com/c/YourMoneyYourWealth",
        videoUrl: "https://www.youtube.com/watch?v=Jcn_4uVtUGw"
      },
      {
        name: "WhiteBoard Finance",
        url: "https://www.youtube.com/c/WhiteBoardFinance",
        playlistUrl: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
      },
      {
        name: "Money Talks News",
        url: "https://www.youtube.com/c/MoneyTalksNews",
        videoUrl: "https://www.youtube.com/watch?v=1QWw3HBZRBs"
      },
      {
        name: "Graham Stephan",
        url: "https://www.youtube.com/c/GrahamStephan",
        videoUrl: "https://www.youtube.com/watch?v=mS9CURzLgVs"
      }
    ],
    icon: <Briefcase className="h-5 w-5 text-white" />,
    colorClass: "bg-purple-500"
  },
  {
    id: "real-estate-investing",
    title: "Real Estate Investing",
    description: "Learn about real estate as an investment vehicle, from rental properties to REITs.",
    difficulty: "Advanced",
    keywords: ["rental property", "REITs", "house hacking", "mortgage", "real estate market"],
    recommendedChannels: [
      {
        name: "Graham Stephan",
        url: "https://www.youtube.com/c/GrahamStephan",
        playlistUrl: "https://www.youtube.com/playlist?list=PLWALQuE0wehvYbplEk4RXi3-c8Tn_rOuA"
      },
      {
        name: "WhiteBoard Finance",
        url: "https://www.youtube.com/c/WhiteBoardFinance",
        videoUrl: "https://www.youtube.com/watch?v=kkG7ifK6j_Q"
      },
      {
        name: "Millennial on Fire",
        url: "https://www.youtube.com/c/MillennialonFire",
        videoUrl: "https://www.youtube.com/watch?v=xbSH3BFYwrM"
      },
      {
        name: "Jack Corsellis",
        url: "https://www.youtube.com/c/JackCorsellis",
        videoUrl: "https://www.youtube.com/watch?v=M5y69v1RbU0"
      }
    ],
    icon: <Home className="h-5 w-5 text-white" />,
    colorClass: "bg-yellow-500"
  },
  {
    id: "tax-optimization",
    title: "Tax Optimization",
    description: "Strategies to legally minimize your tax burden and maximize your after-tax income.",
    difficulty: "Advanced",
    keywords: ["tax deductions", "tax credits", "tax-advantaged accounts", "capital gains", "tax loss harvesting"],
    recommendedChannels: [
      {
        name: "Your Money, Your Wealth",
        url: "https://www.youtube.com/c/YourMoneyYourWealth",
        playlistUrl: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
      },
      {
        name: "WhiteBoard Finance",
        url: "https://www.youtube.com/c/WhiteBoardFinance",
        videoUrl: "https://www.youtube.com/watch?v=kkG7ifK6j_Q"
      },
      {
        name: "BeatTheBush",
        url: "https://www.youtube.com/c/BeatTheBush",
        videoUrl: "https://www.youtube.com/watch?v=PHe0bXAIuk0"
      },
      {
        name: "Graham Stephan",
        url: "https://www.youtube.com/c/GrahamStephan",
        videoUrl: "https://www.youtube.com/watch?v=mS9CURzLgVs"
      }
    ],
    icon: <DollarSign className="h-5 w-5 text-white" />,
    colorClass: "bg-indigo-500"
  },
  {
    id: "financial-independence",
    title: "Financial Independence",
    description: "Principles and strategies for achieving financial independence and potentially retiring early.",
    difficulty: "Intermediate",
    keywords: ["FIRE", "financial freedom", "passive income", "early retirement", "investment income"],
    recommendedChannels: [
      {
        name: "Millennial on Fire",
        url: "https://www.youtube.com/c/MillennialonFire",
        playlistUrl: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
      },
      {
        name: "Graham Stephan",
        url: "https://www.youtube.com/c/GrahamStephan",
        videoUrl: "https://www.youtube.com/watch?v=mS9CURzLgVs"
      },
      {
        name: "Andrei Jikh",
        url: "https://www.youtube.com/c/AndreiJikh",
        videoUrl: "https://www.youtube.com/watch?v=Vb3IZ7GTlhI"
      },
      {
        name: "Jack Corsellis",
        url: "https://www.youtube.com/c/JackCorsellis",
        videoUrl: "https://www.youtube.com/watch?v=M5y69v1RbU0"
      }
    ],
    icon: <Landmark className="h-5 w-5 text-white" />,
    colorClass: "bg-orange-500"
  },
  {
    id: "credit-building",
    title: "Credit Building & Optimization",
    description: "How to build, improve, and maintain a strong credit score for better financial opportunities.",
    difficulty: "Beginner",
    keywords: ["credit score", "credit report", "credit cards", "credit utilization", "payment history"],
    recommendedChannels: [
      {
        name: "Ask Sebby",
        url: "https://www.youtube.com/c/AskSebby",
        playlistUrl: "https://www.youtube.com/playlist?list=PLhrwpQKZ-LpFCnBKFGY7KzXddnQySPEKl"
      },
      {
        name: "TruFinancials",
        url: "https://www.youtube.com/c/TruFinancials",
        videoUrl: "https://www.youtube.com/watch?v=0nhXPXYLQQs"
      },
      {
        name: "The Financial Diet",
        url: "https://www.youtube.com/c/TheFinancialDiet",
        videoUrl: "https://www.youtube.com/watch?v=sH_9J9BVVas"
      },
      {
        name: "Next Gen Personal Finance",
        url: "https://www.youtube.com/c/NextGenPersonalFinance",
        videoUrl: "https://www.youtube.com/watch?v=sVKQn2I4HDM"
      }
    ],
    icon: <Shield className="h-5 w-5 text-white" />,
    colorClass: "bg-teal-500"
  },
  {
    id: "college-planning",
    title: "College & Education Planning",
    description: "Strategies for saving for education and managing student loans effectively.",
    difficulty: "Intermediate",
    keywords: ["529 plan", "student loans", "FAFSA", "scholarships", "education savings"],
    recommendedChannels: [
      {
        name: "Next Gen Personal Finance",
        url: "https://www.youtube.com/c/NextGenPersonalFinance",
        playlistUrl: "https://www.youtube.com/playlist?list=PLfpVYDrEXZTKDGQgK8mBGb0Rk3JyErVrK"
      },
      {
        name: "The Financial Diet",
        url: "https://www.youtube.com/c/TheFinancialDiet",
        videoUrl: "https://www.youtube.com/watch?v=sH_9J9BVVas"
      },
      {
        name: "Khan Academy - Personal Finance",
        url: "https://www.youtube.com/c/khanacademy",
        playlistUrl: "https://www.youtube.com/playlist?list=PLSQl0a2vh4HC9lvrBhVt0UkuKsUAJDLdS"
      },
      {
        name: "Your Money, Your Wealth",
        url: "https://www.youtube.com/c/YourMoneyYourWealth",
        videoUrl: "https://www.youtube.com/watch?v=Jcn_4uVtUGw"
      }
    ],
    icon: <GraduationCap className="h-5 w-5 text-white" />,
    colorClass: "bg-pink-500"
  },
  {
    id: "side-hustles",
    title: "Side Hustles & Income Streams",
    description: "Ideas and strategies for creating additional income streams beyond your primary job.",
    difficulty: "Beginner",
    keywords: ["passive income", "freelancing", "online business", "gig economy", "entrepreneurship"],
    recommendedChannels: [
      {
        name: "Graham Stephan",
        url: "https://www.youtube.com/c/GrahamStephan",
        playlistUrl: "https://www.youtube.com/playlist?list=PLWALQuE0wehvYbplEk4RXi3-c8Tn_rOuA"
      },
      {
        name: "Millennial on Fire",
        url: "https://www.youtube.com/c/MillennialonFire",
        videoUrl: "https://www.youtube.com/watch?v=xbSH3BFYwrM"
      },
      {
        name: "Jack Corsellis",
        url: "https://www.youtube.com/c/JackCorsellis",
        videoUrl: "https://www.youtube.com/watch?v=M5y69v1RbU0"
      },
      {
        name: "Andrei Jikh",
        url: "https://www.youtube.com/c/AndreiJikh",
        videoUrl: "https://www.youtube.com/watch?v=Vb3IZ7GTlhI"
      }
    ],
    icon: <BookOpen className="h-5 w-5 text-white" />,
    colorClass: "bg-emerald-500"
  }
]
