import React from "react";
import { useHistory } from "react-router-dom";
import { PageHeader } from "../../ui-components/page-header/PageHeader";

export const TermsConditions: React.FunctionComponent = () => {
  const history = useHistory();

  const onBackClick = () => {
    history.go(-1);
  };

  return (
    <>
      <PageHeader title="Terms and conditions" />
      <main className="ecl-container ecl-u-pb-l">
        <div className="ecl-u-mt-l ecl-u-mb-2xl">
          <h2 className="ecl-u-type-heading-2">
            General terms &amp; conditions for applications.
          </h2>
          <p className="ecl-u-type-paragraph">
            GENERAL CONDITIONS OF USE OF THE APPLICATION &ldquo;USERS ONBOARDING
            SERVICE&rdquo;.
          </p>
        </div>
        <p className="ecl-u-type-paragraph">
          YOUR ACCEPTANCE OF THIS AGREEMENT WILL BE DEFINITIVELY EVIDENCED BY
          ANY ONE OF THE FOLLOWING MEANS: DOWNLOADING THE SOFTWARE, INSTALLING
          THE SOFTWARE, RUNNING THE SOFTWARE, AND/OR ANY USE OF THE SOFTWARE,
          AND YOUR ACCEPTANCE SHALL BE EFFECTIVE ON THE EARLIER OF THE DATE ON
          WHICH YOU DOWNLOAD, ACCESS, COPY, OR INSTALL THE SOFTWARE PROVIDED
          HEREUNDER (THE &ldquo;EFFECTIVE DATE&rdquo;).IF YOU DO NOT AGREE TO
          THESE TERMS AND CONDITIONS, DO NOT CHECK THE ACCEPTANCE BOX, AND DO
          NOT DOWNLOAD, ACCESS, COPY, INSTALL OR USE THE SOFTWARE.
        </p>
        <p className="ecl-u-type-paragraph">
          PLEASE READ THE FOLLOWING TERMS AND CONDITIONS CAREFULLY BEFORE
          DOWNLOADING, INSTALLING OR USING THE SOFTWARE.{" "}
          <strong>
            THESE TERMS AND CONDITIONS CONSTITUTE A LEGAL AGREEMENT BETWEEN YOU.
          </strong>
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Purpose.-</strong> By downloading, using or accessing the EBSI
          WALLET DID application (the &ldquo;application&rdquo;, or the
          &ldquo;wallet&rdquo;) you agree to the following terms and conditions
          of use (collectively, these &ldquo;Terms&rdquo;). Please read these
          Terms carefully. If you do not agree to all of these Terms, please do
          not use the application. Your use of the Users Onboarding service
          application constitutes your acceptance of and agreement to abide by
          each of these Terms.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>
            Download of the application and access to the Service.-
          </strong>{" "}
          Access to the application is via an EU login, currently requiring only
          a valid email. The application download is free, but the cost of the
          connection necessary for the operation of the same through your mobile
          device, will be at your sole expense and charge according to the rate
          you have contracted with your mobile phone operator.
        </p>
        <p className="ecl-u-type-paragraph">
          The application is intended for use, basically, by citizens
          (hereinafter &ldquo;citizens &rdquo;) residing in EU or accessing from
          EU, so EU declines all responsibility for the access of persons in
          jurisdictions where such distribution or use they could be contrary to
          the norm or regulation. Certain services may not be available or
          authorized in all jurisdictions or for all persons.
        </p>
        <p className="ecl-u-type-paragraph">
          EU reserves the right to eliminate, limit or prevent access to the
          application for objectively justified reasons related to security or
          the suspicion of unauthorized or fraudulent use. Likewise, EU reserves
          the right to withdraw the application from the market when it seems it
          convenient and without prior notice to the USERS.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Software License.-</strong> You fully understand and accept
          that the Software is licensed to you, not sold. For the term of your
          participation we grant you a personal, non-exclusive,
          non-transferable, non-assignable, non-sub-licensable, revocable and
          limited license to install a copy of the application on your personal
          device. This limited license is solely for your personal and
          non-commercial use.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Responsibilities of the user.-</strong> The user undertakes to
          use the services and contents that are provided through the
          application in accordance with the current legislation applicable to
          each of them, the principles of good faith and generally accepted
          uses. Any use for illegal purposes or that harms or could damage in
          any way, the use and normal operation of the application, is
          prohibited.
        </p>
        <p className="ecl-u-type-paragraph">
          Any use for purposes contrary to the content of these Conditions of
          Use is prohibited, harmful to the interests or rights of third
          parties, or that in any way may damage, disable, render inaccessible
          or deteriorate the application, its contents or its services or
          intended for prevent a normal enjoyment of it by users.
          <br />
          EU does not respond in any way to the actions that the user could
          perform for the improper use of the application.
          <br />
          Registration in the application on behalf of and on behalf of any
          other person without their authorization is totally prohibited.
          <br />
          The user always has the obligation to be diligent and take the
          necessary security measures to maintain the confidentiality of his
          access to the application, his password for the key generation,
          private keys and encryption secrets. In the event that such
          confidentiality is altered, you must notify EU without undue delay,
          any unauthorized access, improper use, misuse by third parties, loss,
          loss or subtraction of your keys, as soon as you have knowledge or
          suspicion of such circumstances.
          <br />
          The device on which you install this application can receive
          notifications of the operations you perform through it, information
          that anyone with access to the device could see. The application
          implements security measures and it is very important that you do not
          disable them, as well as those of access to the device itself.
          Additionally, it is convenient that in any case you close the
          application when you finish your session.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Requirements for the use of services and content.-</strong>{" "}
          The access and/or use of the application is completely voluntary and
          attributes to the person who performs it the condition of user, just
          installing the application on your mobile device for use. Every user,
          when installing the application, accepts the present conditions of use
          and data protection. Consequently, the user must read and accept each
          other carefully before installing the application, having updated
          information on them on the website{" "}
          <a
            className="ecl-link"
            href="https://ec.europa.eu/info/legal-notice_en"
          >
            https://ec.europa.eu/info/legal-notice_en
          </a>{" "}
          or in the application.
        </p>
        <p className="ecl-u-type-paragraph">
          In any case, EU reserves the right, at any time and without prior
          notice, to modify these conditions of use.
          <br />
          Likewise, the reproduction, distribution, transmission, adaptation or
          modification, by any means and in any form, of the contents of the
          application (texts, designs, graphics, information, databases, sound
          and/ or image files, logos and other elements is prohibited), unless
          prior authorization of EU or when so permitted by law. Any commercial
          or advertising use, other than that strictly permitted, where
          appropriate, and the violation, in general, of any rights derived
          therefrom, are prohibited.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Limitation of Liability.-</strong> EU does not guarantee or be
          held liable, in any case or circumstance, for the following facts and
          contents, or for any damages that may, where appropriate, arise from
          them:
        </p>
        <ul className="ecl-u-type-paragraph">
          <li>
            Lack of availability, continuity, access, maintenance and effective
            operation of the application and/or its services and updating,
            accuracy, completeness, relevance, timeliness and reliability of its
            contents, whatever the cause and technical difficulties or problems
            or another nature in which these facts originate.
          </li>
          <li>
            The transmission and/or existence of viruses, other elements or
            programs harmful to the devices of the users that could affect them,
            as a consequence of the access, use or examination of the
            application site, or that produced alterations in their electronic
            documents or files.
          </li>
          <li>
            Vices or defects of the contents and/or services that are accessed
            through the application.
          </li>
          <li>
            For the reception, storage, obtaining, dissemination or transmission
            by the users of the contents of the application.
          </li>
        </ul>
        <p className="ecl-u-type-paragraph">
          The above enumeration is merely enunciative and is not, in any case,
          exclusive or exclusive in any of its points. In all cases, EU excludes
          any liability for damages of any kind derived directly or indirectly
          from them and from any other unspecified of similar characteristics.
          <br />
          The acceptance of these Conditions of Use by downloading the
          application and using the service is valid and binding for both
          parties. The contract will last indefinitely.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Withdrawal, cancellation and / or withdrawal. -</strong> The
          user may at any time withdraw from the service by uninstalling the
          application from his device, without needing to communicate anything
          to EU. These general conditions will be governed by EU legislation.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>
            Extrajudicial claim procedure. Applicable legislation and
            jurisdiction. -
          </strong>{" "}
          In case of divergence on any matter related to these general
          conditions, you can make a prior claim to the EU at the address{" "}
          <a className="ecl-link" href="https://ec.europa.eu/">
            https://ec.europa.eu/
          </a>
          .
          <br />
          These general conditions will be governed by EU legislation. Issues
          that arise on the occasion of the interpretation, application or
          execution thereof are subject to the jurisdiction of the Belgium
          courts and tribunals that are competent in accordance with Belgium
          procedural legislation.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Privacy policy.-</strong> The data you provide us when
          installing or downloading the Application will be processed by the
          European Commission or Member State hosting an EBSI Stack Node to make
          available a service consisting of access and use of the
          functionalities available in every moment They will not be
          communicated to any third party, unless legally binding, and will not
          be used for any other purpose.
          <br />
          All legal issues related to the use of your data in the framework of
          the Application (for example, retention periods, recipients, as well
          as your rights) are those collected at{" "}
          <a className="ecl-link" href="https://www.EU/legal/privacy-policy/">
            https://www.EU/legal/privacy-policy/
          </a>{" "}
          .
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Security.-</strong> In compliance with current regulations, EU
          has adopted the necessary technical and organizational measures to
          maintain the level of security required in response to the personal
          data processed. It is also equipped with the precise mechanisms at its
          disposal to avoid as far as possible unauthorized access, subtractions
          and illegal modifications and loss of data. Additionally, EU
          recommends to the USER the use of all the security tools at his
          disposal, not being responsible EU for theft, modification or loss of
          illegal data caused by illegitimate intrusions in his mobile device.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Intellectual property.-</strong> EU retains all right, title
          and interest in and to the Application including all copyright,
          patents, trade secrets, trademarks, trade names, logos, slogans,
          custom graphics, button icons, scripts, videos, text, images,
          software, code, files, content, information and other intellectual
          property rights and nothing may be copied, imitated or used, in whole
          or in part, without our express prior written consent. EU reserves all
          rights not expressly granted.
          <br />
          Nothing in these Terms will be construed as conferring any right or
          license to any patent, trademark, copyright or other intellectual
          property or proprietary rights of EU or any third party by implication
          or otherwise.
        </p>
        <br />
        <p className="bigger ecl-u-type-paragraph">
          Specific terms &amp; conditions for subjects and third parties using
          verifiable IDs and attestations Obligations of subjects who receive
          credentials
        </p>
        <br />
        <p className="ecl-u-type-paragraph">
          <strong>The user or Users Onboarding service holder.-</strong> These
          are natural persons, citizens of the EU, with a mobile phone device
          under their control, who have voluntarily registered through an EU
          login (currently only a valid email is required), and who, by
          accepting the terms of use of the application, they have create an
          Users Onboarding service, which allows them to identify themselves
          and/or prove their identity in the manner provided by the terms of
          use.
          <br />
          Users Onboarding service holders have control over their private keys
          and encryption secrets and receive backup phrases for their private
          keys. Users Onboarding service holders can perform write transactions
          in the EBSI blockchain.
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Ownership of the service and other elements.-</strong> The
          user recognizes that the EU is the owner of all the computer software
          applications and specifications that it provides.
          <br />
          The user will have a non-exclusive license, with the character of
          unlimited and non-transferable, of software and other elements
          delivered by the EU, in connection with the provision of the service.
          <br />
          This license of use is limited to the uses described in this document
          and related documentation as it is seen in the Internet address EBSI
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Obligations of the users.-</strong>
        </p>
        <ol className="ecl-u-type-paragraph">
          <li>
            Service request: the user expressly requests the provision of the
            Users Onboarding service and is obliged to use it in accordance with
            the procedures, service regulations, and, where appropriate, the
            technical components supplied by the EU.
          </li>
          <li>
            Accuracy of the information: The user will be obliged to provide the
            necessary data for the provision of the service, and must be
            responsible for ensuring that all the information included, by any
            means, in the application is accurate, complete for the purpose of
            the service, and is updated during the provision of the service. The
            user must immediately inform the UE of any inaccuracies detected
            once the application has been registered, as well as the changes
            that occur in the information provided
          </li>
          <li>
            Delivery and acceptance of the service: The user accepts these
            conditions at the time of entering their data, and accept the
            service on their mobile device, by checking the corresponding box.
          </li>
          <li>
            Obligation of custody: The user is obliged to guard the
            confidentiality of his access to the application, his password for
            the key generation, private keys and encryption secrets. In case of
            loss or theft of the mobile device, it is necessary that you
            immediately request the suspension or revocation of the service
            through the same application, from an authorized office, through the
            web, or another enabled telephone channel.
          </li>
          <li>
            Obligations of correct use: The user is obliged to use the service
            exclusively for the authorized uses in these Specific terms &amp;
            conditions. The user must comply with any law and regulation that
            may affect his right to use the system and specifically, the
            applicable regulations regarding trust services in whatever is
            appropriate. The user cannot adopt inspection, alteration or
            decompilation measures of application without the prior express
            permission of the EU.
          </li>
          <li>
            Prohibited transactions: The user undertakes not to use the EBSI
            wallet DID or any other technical support provided by the EU to
            carry out any transaction prohibited by applicable law. Users
            Onboarding service DID has not been designed or in any case allows
            its use or resale as control equipment for dangerous situations, or
            for uses that require error-proof actions, such as the operation of
            nuclear facilities, navigation systems or aerial communication,
            systems of air traffic control or weapons control systems, where an
            error could directly cause death, physical damage or serious
            environmental damage.
          </li>
        </ol>
        <p className="ecl-u-type-paragraph">
          Obligations of the third parties using verifiable IDs and attestations
        </p>
        <ol className="ecl-u-type-paragraph">
          <li>
            Third parties using verifiable IDs and attestations (Third parties),
            are obliged to provide the services in the manner provided in terms
            and conditions, in the documentation of the applicable Users
            Onboarding service DID services, and subject to the current
            regulatory legislation, including, when applicable, the Regulation
            (EU) ) nº 910/2014, of July 23 and the legislation that is dictated
            for its development, to its own pacts
          </li>
          <li>
            Specifically, third parties are obligated to:
            <ul className="ecl-u-type-paragraph">
              <li>
                Identify and authenticate the User or wallet holder, correctly.
              </li>
              <li>
                Safely keep all the information and evidence generated as a
                result of its activity.
              </li>
              <li>
                Enable the necessary computer and telematic system to validate
                transactions.
              </li>
              <li>
                Fulfil its obligations derived from the GDPR, and specifically
                store the strict information necessary for the provision of the
                service.
              </li>
            </ul>
          </li>
        </ol>
        <p className="ecl-u-type-paragraph">
          <strong>Terms &amp; conditions for node operators.</strong>
          <br /> <br />
          This document establishes the terms and conditions for node operators.
          <br /> <br />
          <strong>Presentation.-</strong> EBSI Platform is a peer to peer
          network of interconnected nodes of two types:
        </p>
        <ol className="ecl-u-type-paragraph">
          <li>EBSI nodes at European level, operate by the Commission</li>
          <li>
            EBSI nodes at a national level, operate by following Member States:
            Italy, Spain, Belgium, France, Sweden, Austria, Malta.
          </li>
        </ol>
        <p className="ecl-u-type-paragraph">
          All the nodes will be able to create and broadcast transactions that
          will update the ledger.
        </p>
        <p className="ecl-u-type-paragraph">
          The architecture of each node will be composed of two main functional
          areas:
        </p>
        <ul className="ecl-u-type-paragraph">
          <li>
            A set of four layers comprising components which together provide
            the EBSI infrastructure, which contain capabilities common to all
            use cases. These layers will include generic capabilities and
            connectivity to Blockchain networks.
          </li>
          <li>
            A set of two layers comprising use case-specific components enabling
            support for hosting of business applications.
          </li>
        </ul>
        <p className="ecl-u-type-paragraph">
          <strong>EBSI V1.0 Stack Nodes</strong>
          <br />
          EBSI 1.0 is a public permissioned network that requires EBSI
          full-stack nodes infrastructure, with several distributed validator
          nodes, basic redundancy, capacity to handle smart contracts, run
          transactions on those smart-contracts, with access control mechanism
          on them (Note: access control on smart contracts may not be all the
          time a core feature as it may imply wide type of implementations).
          <br />
          All the members of the consortium (network) will use the same
          open-source EBSI Stack Node template. Each member of the network will
          activate/deactivate any module (container) of the Stack Node Template,
          based on the predefined agreement in respect to the use cases that
          will be implemented.
          <br />
          For EBSI v1.0, the nodes will run on the host operating system Linux.
          A single Stack Node template is composed of a set of containers, that
          can be run with different containers managers (Docker has been
          selected for the V1.0) and that can be deployed on Virtual Machines
          node.
          <br />
          To setup the EBSI v1.0 network, a minimum set of redundant nodes will
          be deployed by DIGIT for the European Commission. While European
          Commission will utilize its own infrastructure provider (based on the
          existing Cloud Framework contract), each Member State will define one
          or more contributing entities that will setup an EBSI node directly
          within their existing premises or through their own provider. All
          European Commission&#8217;s nodes will be implemented on VM machines
          in the cloud, spread in different European geo-locations as depicted
          below.
          <br />
          At any time EBSI team may (and will) assess the overall structure of
          EBSI in order to ensure full decentralization and avoid concentration
          of nodes (e.g. in a specific member state or managed by a specific
          cloud provider).
          <br />
          All bare metal VM machines used for the EBSI v1.0 Stack Nodes will
          have the following minimum technical requirements:
        </p>
        <ul className="ecl-u-type-paragraph">
          <li>4vCPU</li>
          <li>16G RAM</li>
          <li>1TB SSD</li>
          <li>Linux OS</li>
        </ul>
        <p className="ecl-u-type-paragraph">
          Inside each EBSI bare-metal VM node, each sub-component will run in a
          dedicated docker container. Ubuntu server 18.04 LTS will be used for
          the docker container OS. If the Member State will also handle specific
          services managing application capabilities, additional computer
          infrastructure may be needed. Whenever Member States/Entities will
          have their existing business logic running in their IT Infrastructure,
          EBSI Application API/Libraries will require to be installed on their
          environment in order to permit their existing business process to
          integrate with EBSI Network infrastructure.
          <br />
          The Stack Nodes will be interconnected with each other at containers
          level.
          <br />
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>General Architecture Aspects </strong>
          <br />
          See:{" "}
          <a
            className="ecl-link"
            href="https://ec.europa.eu/cefdigital/wiki/display/CEFDIGITAL/Minimum+Technical+Requirements+for+an+EBSI+v1.0+NODE+Deployment"
          >
            Minimum Technical Requirements for an EBSI v1.0 NODE Deployment
            within Member States or Institutions
          </a>
          <br />
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>Technical Requirements.-</strong> EBSI data stores include
          Ethereum/Fabric blockchains, Cassandra database distributed to all
          nodes, Gluster file system distributed to all nodes, Mongo DB database
          particular to each node.
          <br />
          EC Node Infrastructure Architecture - to be published on CEF Building
          Blocks Web Site &gt;{" "}
          <a
            className="ecl-link"
            href="https://ec.europa.eu/cefdigital/wiki/display/CEFDIGITAL/EBSI"
          >
            EBSI
          </a>{" "}
          or requested from EBSI support at{" "}
          <a className="ecl-link" href="mailto:CEF-EBSI-support@ec.europa.eu">
            CEF-EBSI-support@ec.europa.eu
          </a>
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>
            Terms of usage of hosting a node for the member states.-
          </strong>{" "}
          The Commission or EBP reserves the right to request a takedown of the
          network or node for the whole network or just one node
        </p>
        <p className="ecl-u-type-paragraph">
          <strong>
            Node Operator Authorization, Representation and Warranties,
            Obligations.
          </strong>
        </p>
        <ol className="ecl-u-type-paragraph">
          <li>
            Responsibilities at all times during this Agreement:
            <ul className="ecl-u-type-paragraph">
              <li>
                To comply with the terms of this Agreement and the terms of all
                other agreements to which you are a party in connection with
                your performance under this Agreement.
              </li>
              <li>
                To operate the Node in strict compliance with terms of this
                Agreement and will not take any action not expressly authorized
                hereunder.
              </li>
              <li>
                To comply with the documentation of the applicable Users
                Onboarding service DID services, and subject to the current
                regulatory legislation.
              </li>
              <li>
                You acknowledge and agree to, and will at all times comply with,
                the Node Information Policy located at:{" "}
                <a
                  className="ecl-link"
                  href="https://ec.europa.eu/cefdigital/wiki/pages/viewpage.action?pageId=189432828"
                >
                  5 - EBSI v1 Node Operator Terms &amp; Conditions
                </a>
              </li>
              <li>
                To not modify or attempt to modify the Software for any purpose
                including but not limited to attempting to circumvent the audit,
                bypass security, manipulate the performance of, or otherwise
                disrupt the Services, or otherwise interfere with the operation
                of the EBSI Services.
              </li>
              <li>
                The Node will meet all performance requirements referred to in
                this Agreement, as well as any performance requirements set
                forth in the Documentation or other instructions;
              </li>
              <li>
                In connection with your use of the Software and/or operation of
                a Node hereunder, UE may provide notice of and may, from time to
                time, require you to affirm and/or re-affirm your agreement to
                this Agreement; your continued use of the Software is contingent
                upon your promptly providing such affirmation as requested by
                UE.
              </li>
            </ul>
          </li>
          <li>
            Restrictions You will not operate the Node except as expressly
            authorized hereunder. Without limiting the generality of the
            foregoing, you will not:
            <ul className="ecl-u-type-paragraph">
              <li>Operate more than one Node.</li>
              <li>
                Operate a Node that does not meet the following technical
                requirements
              </li>
            </ul>
          </li>
        </ol>
        <button
          type="button"
          className="ecl-button ecl-button--primary"
          onClick={onBackClick}
        >
          Back
        </button>
      </main>
    </>
  );
};

export default TermsConditions;
