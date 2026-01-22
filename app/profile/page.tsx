'use client';

import { motion } from 'framer-motion';
import { Building2, Phone, Mail, Globe, Users, Shield, FileCheck, Award } from 'lucide-react';
import Navigation from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import companyProfile from '@/data/company_profile.json';

export default function ProfilePage() {
  const { companyProfile: profile, signature } = companyProfile;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-[#0F172A] mb-4">Company Profile</h1>
          <p className="text-lg text-[#0F172A]/60">
            View your company information used for document automation
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <CardTitle>Company Information</CardTitle>
                    <CardDescription>Basic company details</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Legal Name</p>
                  <p className="font-semibold text-[#0F172A]">{profile.basic.legalName}</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Registration Number</p>
                  <p className="font-semibold text-[#0F172A]">{profile.basic.registrationNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Company Type</p>
                  <p className="font-semibold text-[#0F172A]">{profile.basic.companyType}</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">VAT Number</p>
                  <p className="font-semibold text-[#0F172A]">{profile.basic.vatNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Tax PIN</p>
                  <p className="font-semibold text-[#0F172A]">{profile.basic.taxPin}</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">CSD Number</p>
                  <p className="font-semibold text-[#0F172A]">{profile.basic.csdNumber}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <CardTitle>Contact Details</CardTitle>
                    <CardDescription>How to reach us</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Physical Address</p>
                  <p className="font-semibold text-[#0F172A]">{profile.contact.physicalAddress}</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Postal Address</p>
                  <p className="font-semibold text-[#0F172A]">{profile.contact.postalAddress}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0F172A]/60" />
                  <p className="font-semibold text-[#0F172A]">{profile.contact.telephone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#0F172A]/60" />
                  <p className="font-semibold text-[#0F172A]">{profile.contact.cellphone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#0F172A]/60" />
                  <p className="font-semibold text-[#0F172A]">{profile.contact.email}</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Fax</p>
                  <p className="font-semibold text-[#0F172A]">{profile.contact.fax}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <CardTitle>Directors</CardTitle>
                    <CardDescription>Company directors</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {profile.directors.map((director, idx) => (
                  <div key={idx} className="border-b border-[#0F172A]/10 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm text-[#0F172A]/60 mb-1">Name</p>
                      <p className="font-semibold text-[#0F172A]">{director.name}</p>
                    </div>
                    {director.idNumber && (
                      <div className="mt-2">
                        <p className="text-sm text-[#0F172A]/60 mb-1">ID Number</p>
                        <p className="font-semibold text-[#0F172A]">{director.idNumber}</p>
                      </div>
                    )}
                    <div className="mt-2">
                      <p className="text-sm text-[#0F172A]/60 mb-1">Position</p>
                      <p className="font-semibold text-[#0F172A]">{director.position}</p>
                    </div>
                    {director.otherAffiliations && (
                      <div className="mt-2">
                        <p className="text-sm text-[#0F172A]/60 mb-1">Other Affiliations</p>
                        <p className="text-sm text-[#0F172A]">{director.otherAffiliations}</p>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#059669] rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Compliance Status</CardTitle>
                    <CardDescription>Regulatory compliance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#0F172A]/60">RSA Resident</p>
                  <p className="font-semibold text-[#0F172A]">{profile.compliance.rsaResident ? 'Yes' : 'No'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#0F172A]/60">Has Branch</p>
                  <p className="font-semibold text-[#0F172A]">{profile.compliance.hasBranch ? 'Yes' : 'No'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#0F172A]/60">Accredited Rep</p>
                  <p className="font-semibold text-[#0F172A]">{profile.compliance.accreditedRep ? 'Yes' : 'No'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#0F172A]/60">Foreign Supplier</p>
                  <p className="font-semibold text-[#0F172A]">{profile.compliance.foreignSupplier ? 'Yes' : 'No'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#0F172A]/60">State Employment</p>
                  <p className="font-semibold text-[#0F172A]">{profile.compliance.stateEmployment ? 'Yes' : 'No'}</p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#0F172A]/60">Related Enterprises</p>
                  <p className="font-semibold text-[#0F172A]">{profile.compliance.relatedEnterprises ? 'Yes' : 'No'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#D4AF37] rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-[#0F172A]" />
                  </div>
                  <div>
                    <CardTitle>BEE Preferences</CardTitle>
                    <CardDescription>Ownership preferences</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Women Owned</p>
                  <p className="font-semibold text-[#0F172A]">{profile.preferences.womenOwnedPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Youth Owned</p>
                  <p className="font-semibold text-[#0F172A]">{profile.preferences.youthOwnedPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">PWD Owned</p>
                  <p className="font-semibold text-[#0F172A]">{profile.preferences.pwdOwnedPercent}%</p>
                </div>
                <div>
                  <p className="text-sm text-[#0F172A]/60 mb-1">Points Claimed</p>
                  <p className="font-semibold text-[#0F172A]">{profile.preferences.pointsClaimed}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants} className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0F172A] rounded-lg flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <CardTitle>Authorized Signature</CardTitle>
                    <CardDescription>Digital signature for documents</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-[#0F172A]/20 rounded-lg p-4 bg-white">
                  <p className="text-sm text-[#0F172A]/60 mb-2">Signature Preview</p>
                  <img
                    src={signature.base64}
                    alt="Signature"
                    className="max-h-24 mx-auto"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
