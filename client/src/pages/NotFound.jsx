import { Compass } from 'lucide-react';
import { Button, Empty } from '../components/ui';

export default function NotFound() {
  return (
    <div className="page py-20">
      <Empty icon={Compass} title="This page doesn't exist" action={<Button to="/">Go to the home page</Button>}>
        The link may be old or mistyped.
      </Empty>
    </div>
  );
}
