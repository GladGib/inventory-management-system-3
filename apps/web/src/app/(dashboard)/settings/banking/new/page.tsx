'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  Select,
  InputNumber,
  Button,
  Space,
  Typography,
  Divider,
} from 'antd';
import { ArrowLeftOutlined, BankOutlined, SaveOutlined } from '@ant-design/icons';
import { useCreateBankAccount } from '@/hooks/use-banking';
import { MALAYSIAN_BANKS, type CreateBankAccountDto } from '@/lib/banking';

const { Title, Text } = Typography;

const bankOptions = MALAYSIAN_BANKS.map((bank) => ({
  value: bank.name,
  label: `${bank.name} (${bank.shortName})`,
  code: bank.code,
}));

export default function NewBankAccountPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const createAccount = useCreateBankAccount();

  const handleBankSelect = (bankName: string) => {
    const bank = MALAYSIAN_BANKS.find((b) => b.name === bankName);
    if (bank) {
      form.setFieldsValue({
        bankCode: bank.code,
        swiftCode: bank.code,
      });
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const dto: CreateBankAccountDto = {
        bankName: values.bankName,
        bankCode: values.bankCode,
        accountNumber: values.accountNumber,
        accountName: values.accountName,
        accountType: values.accountType || 'CURRENT',
        swiftCode: values.swiftCode || undefined,
        openingBalance: values.openingBalance || 0,
      };

      await createAccount.mutateAsync(dto);
      router.push('/settings/banking');
    } catch {
      // Validation errors handled by form
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push('/settings/banking')}
        />
        <Title level={4} style={{ margin: 0 }}>
          <BankOutlined style={{ marginRight: 8 }} />
          Add Bank Account
        </Title>
      </div>

      <Card style={{ maxWidth: 700 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            accountType: 'CURRENT',
            openingBalance: 0,
          }}
        >
          <Title level={5}>Bank Details</Title>

          <Form.Item
            name="bankName"
            label="Bank"
            rules={[{ required: true, message: 'Please select a bank' }]}
          >
            <Select
              placeholder="Select your bank"
              showSearch
              filterOption={(input, option) =>
                (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
              }
              options={bankOptions}
              onChange={handleBankSelect}
            />
          </Form.Item>

          <Form.Item
            name="bankCode"
            label="Bank Code / SWIFT"
            rules={[{ required: true, message: 'Bank code is required' }]}
            extra="Automatically filled when you select a bank. You can edit it manually."
          >
            <Input placeholder="e.g. MBBEMYKL" maxLength={20} />
          </Form.Item>

          <Form.Item
            name="swiftCode"
            label="SWIFT Code"
            extra="Optional. Used for international transfers."
          >
            <Input placeholder="e.g. MBBEMYKL" maxLength={20} />
          </Form.Item>

          <Divider />

          <Title level={5}>Account Details</Title>

          <Form.Item
            name="accountNumber"
            label="Account Number"
            rules={[{ required: true, message: 'Account number is required' }]}
          >
            <Input placeholder="e.g. 5123-4567-8901" maxLength={50} />
          </Form.Item>

          <Form.Item
            name="accountName"
            label="Account Holder Name"
            rules={[{ required: true, message: 'Account name is required' }]}
            extra="The name registered with the bank (company or individual name)."
          >
            <Input placeholder="e.g. Syarikat ABC Sdn Bhd" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="accountType"
            label="Account Type"
          >
            <Select
              options={[
                { value: 'CURRENT', label: 'Current Account' },
                { value: 'SAVINGS', label: 'Savings Account' },
              ]}
            />
          </Form.Item>

          <Divider />

          <Title level={5}>Opening Balance</Title>

          <Form.Item
            name="openingBalance"
            label="Opening Balance (MYR)"
            extra="The current balance in this bank account. This will be used as the starting point for tracking."
          >
            <InputNumber
              style={{ width: '100%' }}
              prefix="RM"
              precision={2}
              min={0}
              placeholder="0.00"
            />
          </Form.Item>

          <Divider />

          <Form.Item>
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSubmit}
                loading={createAccount.isPending}
              >
                Save Bank Account
              </Button>
              <Button onClick={() => router.push('/settings/banking')}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
