import React, { useEffect, useState } from 'react';
import { Check, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  features: string[];
  priceId?: string;
}

const Pricing: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await api.getPricingPlans();
      setPlans(data);
    } catch (error) {
      toast.error('Failed to load pricing plans');
    }
  };

  const handleUpgrade = async (plan: Plan) => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!plan.priceId) {
      toast.error('Invalid plan');
      return;
    }

    setLoading(plan.id);

    try {
      const { url } = await api.createCheckoutSession(
        plan.priceId,
        `${window.location.origin}/editor?upgrade=success`,
        `${window.location.origin}/pricing`
      );

      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start checkout');
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white py-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">Pricing Plans</h1>
          <p className="text-xl text-gray-600">Choose the plan that fits your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`bg-white rounded-lg shadow-xl p-8 ${
                plan.id.includes('pro') ? 'ring-2 ring-primary-600' : ''
              }`}
            >
              {plan.id.includes('pro') && (
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Crown className="w-5 h-5 text-primary-600" />
                  <span className="text-primary-600 font-semibold">MOST POPULAR</span>
                </div>
              )}

              <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>

              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900">${plan.price}</span>
                {plan.price > 0 && (
                  <span className="text-gray-600 ml-2">/ {plan.interval}</span>
                )}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.id === 'free' ? (
                <button
                  onClick={() => navigate('/editor')}
                  className="w-full py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Get Started
                </button>
              ) : user?.isPro ? (
                <button
                  disabled
                  className="w-full py-3 bg-green-600 text-white rounded-lg font-semibold cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan)}
                  disabled={loading === plan.id}
                  className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
                >
                  {loading === plan.id ? 'Loading...' : 'Upgrade Now'}
                </button>
              )}
            </div>
          ))}
        </div>

        {user?.isPro && (
          <div className="text-center mt-12">
            <button
              onClick={async () => {
                try {
                  const { url } = await api.createBillingPortalSession(
                    `${window.location.origin}/pricing`
                  );
                  window.location.href = url;
                } catch (error) {
                  toast.error('Failed to open billing portal');
                }
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Manage Subscription
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pricing;
