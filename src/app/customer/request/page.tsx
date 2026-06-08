/**
 * /customer/request — 便リクエスト
 */

import { TripRequestForm } from "@/components/forms/TripRequestForm";

export default function CustomerRequestPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-gray-800">便をリクエスト</h1>
      <p className="text-xs text-gray-500">
        希望日や釣り物を入力して船長にリクエストを送ります。承認されると便が作成されます。
      </p>
      <TripRequestForm page />
    </div>
  );
}
