import Layout from '../components/Layout';

export default function Plan() {
  return (
    <Layout>
      <h1 className="text-2xl font-semibold mb-6 text-slate-800">Monthly Plan</h1>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
        <label className="block mb-4">
          <span className="text-sm font-medium text-slate-600">Plan Description</span>
          <textarea className="mt-1 block w-full border border-slate-300 rounded-md p-3 focus:ring-sky-500 focus:border-sky-500 h-64" placeholder="Enter your plan details..."></textarea>
        </label>
        <button className="bg-sky-600 text-white px-4 py-2 rounded-md hover:bg-sky-700 font-medium">Save Plan</button>
      </div>
    </Layout>
  );
}
